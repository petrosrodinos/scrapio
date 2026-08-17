import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CostCategory, OutputFormat, RunStatus } from 'generated/prisma';
import { IntegrationCredentialResolverService } from '@/integrations/credentials/services/integration-credential-resolver.service';
import { CostsService } from '@/modules/costs/costs.service';
import { AiProviders } from '@/integrations/ai/interfaces/ai.interface';
import { calculateAiCost } from '@/integrations/ai/utils/ai-cost';
import { ComputerUseClientService } from './services/computer-use-client.service';
import { PlaywrightDriverService } from './services/playwright-driver.service';
import { ScreenshotStorageService } from './services/screenshot-storage.service';
import { BROWSER_AGENT_SYSTEM_PROMPT } from './constants/browser-agent-prompt';
import {
  MAX_BROWSER_AGENT_IMAGE_TURNS,
  MAX_BROWSER_AGENT_STEPS,
} from './constants/browser-agent.constants';
import { extractJSON } from './utils/extract-json.util';
import { GenerationAction } from './interfaces/computer-use.interface';
import { mapActionType } from './utils/generation-action.util';
import { compactImageMessages } from './utils/generation-message.util';
import { BrowserAgentRunOutcome } from './interfaces/browser-agent-run-outcome.interface';
import { NetworkCaptureRecorder } from '@/integrations/api-capture/network-capture-recorder';
import { CaptureEntry } from '@/integrations/api-capture/interfaces/capture-entry.interface';
import { DEFAULT_CAPTURE_CONFIG } from '@/integrations/api-capture/config/capture-defaults.config';

const INITIAL_STEP_HINT =
  'Initial page. Explore as needed to complete the task, then call done with your findings.';

@Injectable()
export class BrowserAgentOrchestratorService {
  private readonly logger = new Logger(BrowserAgentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialResolver: IntegrationCredentialResolverService,
    private readonly computerUseClient: ComputerUseClientService,
    private readonly screenshotStorage: ScreenshotStorageService,
    private readonly costsService: CostsService,
  ) {}

  async run(workflowRunId: string): Promise<BrowserAgentRunOutcome> {
    const run = await this.prisma.workflowRun.findUniqueOrThrow({
      where: { id: workflowRunId },
      include: { extraction_schema_version: true },
    });

    if (!run.url) {
      return {
        findings: null,
        visitedUrls: [],
        browserActions: [],
        aiUsage: { input_tokens: 0, output_tokens: 0, model_calls: 0 },
        failureReason: 'Browser agent run has no target URL configured',
        cancelled: false,
      };
    }

    const maxSteps = run.max_steps ?? MAX_BROWSER_AGENT_STEPS;

    const computerUseIntegration =
      await this.credentialResolver.resolveComputerUseIntegration(run.user_id);
    const model = computerUseIntegration.model;
    const targetUrl = run.url;
    const outputFormats = run.output_formats;
    const schemaDefinition =
      (run.extraction_schema_version?.definition as Record<
        string,
        unknown
      > | null) ?? null;
    const systemPrompt = this.buildSystemPrompt(
      outputFormats,
      schemaDefinition,
      run.workflow_config_id
        ? await this.loadConfigDescription(run.workflow_config_id)
        : null,
    );

    const driver = new PlaywrightDriverService();
    const captureRecorder = run.capture_api
      ? new NetworkCaptureRecorder(DEFAULT_CAPTURE_CONFIG)
      : null;
    const messages: Anthropic.MessageParam[] = [];
    const visitedUrls = new Set<string>([targetUrl]);
    const browserActions: BrowserAgentRunOutcome['browserActions'] = [];
    let finalFindings: Record<string, unknown> | null = null;
    let failureReason: string | null = null;
    let wasCancelled = false;
    let stepIndex = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let modelCalls = 0;
    let capturedRequests: CaptureEntry[] | undefined;

    try {
      await driver.launch(targetUrl);
      captureRecorder?.attach(driver.activeContext);

      while (
        !finalFindings &&
        !failureReason &&
        !wasCancelled &&
        stepIndex < maxSteps
      ) {
        if (await this.isCancelled(workflowRunId)) {
          wasCancelled = true;
          break;
        }

        const screenshotBefore = await driver.screenshot(true);
        const screenshotBeforeId = await this.screenshotStorage.store(
          screenshotBefore,
          `browser-agent-${workflowRunId}-step-${stepIndex}-before.jpg`,
        );

        const stepHint =
          stepIndex === 0
            ? INITIAL_STEP_HINT
            : `Step ${stepIndex}. URL: ${driver.currentPage.url()}.`;

        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: screenshotBefore.toString('base64'),
              },
            },
            { type: 'text', text: stepHint },
          ],
        });

        const requestMessages = compactImageMessages(
          messages,
          MAX_BROWSER_AGENT_IMAGE_TURNS,
        );
        const { rawText, usage } = await this.computerUseClient.sendStep(
          requestMessages,
          systemPrompt,
          model,
          computerUseIntegration.apiKey,
        );
        modelCalls += 1;
        inputTokens += usage?.input_tokens ?? 0;
        outputTokens += usage?.output_tokens ?? 0;
        messages.push({ role: 'assistant', content: rawText });

        if (await this.isCancelled(workflowRunId)) {
          wasCancelled = true;
          break;
        }

        let action: GenerationAction;
        try {
          action = extractJSON<GenerationAction>(rawText);
        } catch {
          messages.push({
            role: 'user',
            content:
              'Your response was not valid JSON. Return ONLY a JSON object, no other text.',
          });
          stepIndex += 1;
          continue;
        }

        const step = await this.prisma.computerUseStep.create({
          data: {
            workflow_run_id: workflowRunId,
            user_id: run.user_id,
            step_index: stepIndex,
            action_type: mapActionType(action.action),
            action_payload: (action.action === 'done'
              ? { config: action.config }
              : {
                  selector: action.selector,
                  url: action.url,
                  text: action.text,
                }) as never,
            screenshot_before_id: screenshotBeforeId,
            model_reasoning: action.reasoning ?? null,
          },
        });

        browserActions.push({
          step_index: stepIndex,
          action: action.action,
          selector: action.selector,
          url: action.url,
          text: action.text,
          reasoning: action.reasoning ?? null,
        });

        if (action.action === 'done') {
          finalFindings = action.config ?? null;
          await this.prisma.computerUseStep.update({
            where: { id: step.id },
            data: { screenshot_after_id: screenshotBeforeId },
          });
          break;
        }

        try {
          await driver.executeAction(action);
        } catch (e) {
          messages.push({
            role: 'user',
            content: `The action "${action.action}"${action.selector ? ` with selector "${action.selector}"` : ''} failed: ${(e as Error).message}. Try a different approach.`,
          });
        }

        visitedUrls.add(driver.currentPage.url());

        if (await this.isCancelled(workflowRunId)) {
          wasCancelled = true;
          break;
        }

        const screenshotAfter = await driver.screenshot();
        const screenshotAfterId = await this.screenshotStorage.store(
          screenshotAfter,
          `browser-agent-${workflowRunId}-step-${stepIndex}-after.png`,
        );
        await this.prisma.computerUseStep.update({
          where: { id: step.id },
          data: { screenshot_after_id: screenshotAfterId },
        });

        stepIndex += 1;
      }

      if (!finalFindings && !failureReason && !wasCancelled) {
        failureReason = `Reached max steps (${maxSteps}) without completing the task`;
      }
    } catch (error) {
      failureReason =
        error instanceof Error
          ? error.message
          : 'Unknown error during browser agent run';
      this.logger.error(
        `browser agent run ${workflowRunId} failed: ${failureReason}`,
      );
    } finally {
      capturedRequests = captureRecorder?.getEntries();
      await driver.close();
    }

    if (modelCalls > 0) {
      this.recordComputerUseCost(run.user_id, workflowRunId, model, {
        inputTokens,
        outputTokens,
        modelCalls,
      });
    }

    return {
      findings: finalFindings,
      visitedUrls: Array.from(visitedUrls),
      browserActions,
      aiUsage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model_calls: modelCalls,
      },
      failureReason,
      cancelled: wasCancelled,
      capturedRequests,
    };
  }

  private recordComputerUseCost(
    userId: string,
    workflowRunId: string,
    model: string,
    usage: { inputTokens: number; outputTokens: number; modelCalls: number },
  ): void {
    setImmediate(() => {
      try {
        const cost = calculateAiCost({
          provider: AiProviders.anthropic,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });

        this.costsService.record({
          userId,
          category: CostCategory.BROWSER_AGENT_RUN,
          amount: cost.totalCost,
          provider: AiProviders.anthropic,
          model,
          workflowRunId,
          metadata: {
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            model_calls: usage.modelCalls,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to compute browser agent cost: ${error.message}`,
        );
      }
    });
  }

  private async isCancelled(workflowRunId: string): Promise<boolean> {
    const current = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      select: { status: true },
    });
    return current?.status === RunStatus.CANCELLED;
  }

  private async loadConfigDescription(
    workflowConfigId: string,
  ): Promise<string | null> {
    const config = await this.prisma.workflowConfig.findUnique({
      where: { id: workflowConfigId },
      select: { description: true },
    });
    return config?.description ?? null;
  }

  private buildSystemPrompt(
    outputFormats: OutputFormat[],
    schemaDefinition: Record<string, unknown> | null,
    description: string | null,
  ): string {
    const taskParts: string[] = [];

    if (schemaDefinition) {
      taskParts.push(
        `Your task is to find and collect information matching this JSON schema (field name -> type/description):\n${JSON.stringify(schemaDefinition, null, 2)}`,
      );
    } else if (
      outputFormats.includes(OutputFormat.MARKDOWN) &&
      outputFormats.length === 1
    ) {
      taskParts.push(
        'Your task: research this website and document what it offers — who runs it, what products/services/content it provides, and any other notable information a visitor would want to know.',
      );
    } else {
      taskParts.push(
        'Your task: explore this website and collect the most relevant information about it.',
      );
    }

    if (description?.trim()) {
      taskParts.push(`Additional instructions:\n${description.trim()}`);
    }

    return `${BROWSER_AGENT_SYSTEM_PROMPT}\n\n## Task\n${taskParts.join('\n\n')}`;
  }
}
