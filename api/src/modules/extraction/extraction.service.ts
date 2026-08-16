import { Injectable, Logger } from '@nestjs/common';
import {
  AiBatchJob,
  AiBatchJobStatus,
  AiBatchRequestItem,
  ExtractionFormatStatus,
  ExtractionResult,
  IntegrationType,
  OutputFormat,
  Prisma,
  RunStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { AiBatchOpenAiService } from '@/integrations/ai/services/ai-batch-openai.service';
import { AiGenerationError, AICostResponse, AiModels } from '@/integrations/ai/interfaces/ai.interface';
import { IntegrationCredentialResolverService } from '@/integrations/credentials/services/integration-credential-resolver.service';
import {
  buildOutputZodSchema,
  buildOutputZodSchemaForOpenAiStrict,
} from '@/shared/utils/schema/schema-definition-to-zod.util';
import { buildOutputJsonSchema } from '@/shared/utils/schema/schema-definition-to-json-schema.util';
import {
  extractRegexFieldValues,
  splitRegexFields,
} from '@/shared/utils/schema/regex-schema-fields.util';
import {
  buildMarkdownFromRawContentPrompt,
  buildMarkdownFromStructuredPrompt,
  buildStructuredCorrectionPrompt,
  buildStructuredExtractionPrompt,
  MARKDOWN_NORMALIZATION_SYSTEM_PROMPT,
  STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
} from './constants/extraction-prompts';
import {
  AiUsageEntry,
  BatchExtractionItem,
  ExtractionOutcome,
  ExtractionRequest,
  MAX_MARKDOWN_ATTEMPTS,
  MAX_STRUCTURED_ATTEMPTS,
} from './interfaces/extraction.interface';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly aiBatchOpenAiService: AiBatchOpenAiService,
    private readonly credentialResolver: IntegrationCredentialResolverService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Runs the shared structured-JSON → Markdown normalization pipeline against a single
   * piece of raw evidence. Used by SCRAPER, BROWSER_AGENT, and PLAIN_SCRAPE workflows alike —
   * none of them talk to the AI SDK directly.
   */
  async extract(request: ExtractionRequest): Promise<ExtractionOutcome> {
    const contentLabel = request.contentLabel ?? 'raw evidence';
    const usageLog: AiUsageEntry[] = [];

    let structuredStatus: ExtractionFormatStatus | null = null;
    let structuredData: unknown = null;
    let structuredRawAiOutput: string | null = null;
    let structuredValidationErrors: unknown = null;
    let structuredAttempts = 0;

    const wantsStructured = request.outputFormats.includes(
      OutputFormat.STRUCTURED_JSON,
    );
    const wantsMarkdown = request.outputFormats.includes(OutputFormat.MARKDOWN);

    if (wantsStructured) {
      const result = await this.runStructuredExtraction(request, contentLabel, usageLog);
      structuredStatus = result.status;
      structuredData = result.data;
      structuredRawAiOutput = result.rawAiOutput;
      structuredValidationErrors = result.validationErrors;
      structuredAttempts = result.attempts;
    }

    let markdownStatus: ExtractionFormatStatus | null = null;
    let markdown: string | null = null;
    let markdownValidationErrors: unknown = null;

    if (wantsMarkdown) {
      const result = await this.runMarkdownNormalization(
        request,
        contentLabel,
        structuredStatus === ExtractionFormatStatus.VALID ? structuredData : null,
        usageLog,
      );
      markdownStatus = result.status;
      markdown = result.markdown;
      markdownValidationErrors = result.validationErrors;
    }

    return {
      structured_status: structuredStatus,
      structured_data: this.toJsonInput(structuredData),
      structured_raw_ai_output: this.toJsonInput(structuredRawAiOutput),
      structured_validation_errors: this.toJsonInput(structuredValidationErrors),
      structured_attempts: structuredAttempts,
      markdown_status: markdownStatus,
      markdown,
      markdown_validation_errors: this.toJsonInput(markdownValidationErrors),
      ai_usage: this.toJsonInput(usageLog.length > 0 ? usageLog : null),
    };
  }

  /**
   * Persists an `ExtractionOutcome` as the single `ExtractionResult` row for either a
   * `WorkflowRun` (SCRAPER, BROWSER_AGENT, or COMBINED PLAIN_SCRAPE) or a `PlainScrapedPage`
   * (PER_URL PLAIN_SCRAPE, one row per page). Upserts so retries/reruns overwrite cleanly.
   */
  async persist(
    outcome: ExtractionOutcome,
    target: {
      workflowRunId?: string | null;
      plainScrapedPageId?: string | null;
      extractionSchemaVersionId?: string | null;
    },
  ): Promise<ExtractionResult> {
    if (!target.workflowRunId && !target.plainScrapedPageId) {
      throw new Error('persist requires either workflowRunId or plainScrapedPageId');
    }

    const where: Prisma.ExtractionResultWhereUniqueInput = target.workflowRunId
      ? { workflow_run_id: target.workflowRunId }
      : { plain_scraped_page_id: target.plainScrapedPageId! };

    const payload = {
      structured_status: outcome.structured_status,
      structured_data: outcome.structured_data,
      structured_raw_ai_output: outcome.structured_raw_ai_output,
      structured_validation_errors: outcome.structured_validation_errors,
      structured_attempts: outcome.structured_attempts,
      markdown_status: outcome.markdown_status,
      markdown: outcome.markdown,
      markdown_validation_errors: outcome.markdown_validation_errors,
      ai_usage: outcome.ai_usage,
      extraction_schema_version_id: target.extractionSchemaVersionId ?? null,
    };

    return this.prisma.extractionResult.upsert({
      where,
      create: {
        workflow_run_id: target.workflowRunId ?? null,
        plain_scraped_page_id: target.plainScrapedPageId ?? null,
        ...payload,
      },
      update: payload,
    });
  }

  /**
   * Submits one or more structured-JSON extraction requests as a single OpenAI batch job
   * instead of calling the AI provider immediately. Used when the config has ai_batch_mode
   * enabled — see background/crawl.processor.ts, plain-scrape.processor.ts,
   * browser-agent.processor.ts. `items` is 1 entry for SCRAPER/BROWSER_AGENT/PLAIN_SCRAPE-COMBINED,
   * or one per page for a PLAIN_SCRAPE PER_URL run.
   *
   * Unlike the immediate path (runStructuredExtraction), this makes a single attempt per item
   * using OpenAI's strict Structured Outputs mode instead of the 3-attempt correction-retry
   * loop — batch responses can't be interactively re-prompted.
   */
  async submitStructuredBatch(
    items: BatchExtractionItem[],
    target: {
      workflowRunId: string;
      userId: string;
      schemaDefinition: Record<string, unknown> | null | undefined;
    },
  ): Promise<AiBatchJob> {
    if (!target.schemaDefinition || Object.keys(target.schemaDefinition).length === 0) {
      throw new Error('AI batch mode requires a structured JSON output schema');
    }

    const { regexFields, remainingDefinition } = splitRegexFields(target.schemaDefinition);
    if (Object.keys(remainingDefinition).length === 0) {
      throw new Error('AI batch mode requires at least one non-regex schema field');
    }

    const credentials = await this.credentialResolver.resolveApiKey({
      userId: target.userId,
      integrationType: IntegrationType.OPENAI,
    });
    const model = credentials.aiModel ?? AiModels.openai.gpt4o;
    const jsonSchema = buildOutputJsonSchema(remainingDefinition);

    const prepared = items.map((item, index) => {
      const regexData =
        Object.keys(regexFields).length > 0
          ? extractRegexFieldValues(regexFields, item.regexContent ?? item.content)
          : {};

      return {
        item,
        customId: `item-${index}`,
        regexData,
        userPrompt: buildStructuredExtractionPrompt({
          content: item.content,
          contentLabel: item.contentLabel ?? 'raw evidence',
          instructions: item.instructions,
          sourceUrl: item.sourceUrl,
        }),
      };
    });

    const { externalBatchId, inputFileId, requestCount } =
      await this.aiBatchOpenAiService.submitBatch(
        credentials.apiKey,
        prepared.map(({ customId, userPrompt }) => ({
          customId,
          model,
          systemPrompt: STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
          userPrompt,
          jsonSchema,
        })),
      );

    return this.prisma.$transaction(async (tx) => {
      const aiBatchJob = await tx.aiBatchJob.create({
        data: {
          workflow_run_id: target.workflowRunId,
          user_id: target.userId,
          external_batch_id: externalBatchId,
          input_file_id: inputFileId,
          request_count: requestCount,
          status: AiBatchJobStatus.SUBMITTED,
        },
      });

      await tx.aiBatchRequestItem.createMany({
        data: prepared.map(({ item, customId, regexData }) => ({
          ai_batch_job_id: aiBatchJob.id,
          custom_id: customId,
          plain_scraped_page_id: item.plainScrapedPageId ?? null,
          source_url: item.sourceUrl ?? null,
          content_label: item.contentLabel ?? null,
          content: item.content,
          instructions: item.instructions ?? null,
          wants_markdown: item.wantsMarkdown,
          regex_data:
            Object.keys(regexData).length > 0
              ? (regexData as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        })),
      });

      return aiBatchJob;
    });
  }

  /**
   * Resolves a completed OpenAI batch job: downloads its output (+ error) file, validates each
   * item's response against the run's schema, runs deferred Markdown normalization for items
   * that requested it (now that structured data is available), and persists one ExtractionResult
   * per item. Called by background/ai-batch-completion.processor.ts once the polling cron
   * observes the batch has reached a terminal OpenAI status.
   */
  async completeBatch(
    aiBatchJobId: string,
  ): Promise<{ items: { item: AiBatchRequestItem; outcome: ExtractionOutcome }[] }> {
    const aiBatchJob = await this.prisma.aiBatchJob.findUniqueOrThrow({
      where: { id: aiBatchJobId },
      include: {
        items: true,
        workflow_run: { include: { extraction_schema_version: true } },
      },
    });

    const credentials = await this.credentialResolver.resolveApiKey({
      userId: aiBatchJob.user_id,
      integrationType: IntegrationType.OPENAI,
    });

    const schemaDefinition =
      (aiBatchJob.workflow_run.extraction_schema_version?.definition as
        | Record<string, unknown>
        | null
        | undefined) ?? {};
    const { remainingDefinition } = splitRegexFields(schemaDefinition);
    const zodSchema = buildOutputZodSchemaForOpenAiStrict(remainingDefinition);

    const outputByCustomId = new Map<string, { content?: string; error?: string }>();

    if (aiBatchJob.output_file_id) {
      const raw = await this.aiBatchOpenAiService.downloadFileContent(
        credentials.apiKey,
        aiBatchJob.output_file_id,
      );
      this.parseBatchOutputLines(raw, outputByCustomId);
    }

    if (aiBatchJob.error_file_id) {
      const raw = await this.aiBatchOpenAiService.downloadFileContent(
        credentials.apiKey,
        aiBatchJob.error_file_id,
      );
      this.parseBatchErrorLines(raw, outputByCustomId);
    }

    const results: { item: AiBatchRequestItem; outcome: ExtractionOutcome }[] = [];

    for (const item of aiBatchJob.items) {
      const output = outputByCustomId.get(item.custom_id);
      const usageLog: AiUsageEntry[] = [];

      let structuredStatus: ExtractionFormatStatus;
      let structuredData: unknown = null;
      let structuredRawAiOutput: string | null = null;
      let structuredValidationErrors: unknown = null;

      if (!output || output.error || !output.content) {
        structuredStatus = ExtractionFormatStatus.FAILED;
        structuredValidationErrors = {
          message: output?.error ?? 'No response returned for this item in the batch output',
        };
      } else {
        structuredRawAiOutput = output.content;
        try {
          const parsedJson: unknown = JSON.parse(output.content);
          const validated = zodSchema.parse(parsedJson) as Record<string, unknown>;
          structuredData = { ...((item.regex_data as Record<string, unknown>) ?? {}), ...validated };
          structuredStatus = ExtractionFormatStatus.VALID;
        } catch (error) {
          structuredStatus = ExtractionFormatStatus.INVALID;
          structuredValidationErrors = this.describeValidationError(error);
          this.logger.warn(
            `Batch item ${item.custom_id} (job ${aiBatchJobId}) failed schema validation: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      let markdownStatus: ExtractionFormatStatus | null = null;
      let markdown: string | null = null;
      let markdownValidationErrors: unknown = null;

      if (item.wants_markdown) {
        const markdownResult = await this.runMarkdownNormalization(
          {
            userId: aiBatchJob.user_id,
            outputFormats: [],
            content: item.content,
            contentLabel: item.content_label ?? 'raw evidence',
            instructions: item.instructions,
            sourceUrl: item.source_url,
          },
          item.content_label ?? 'raw evidence',
          structuredStatus === ExtractionFormatStatus.VALID ? structuredData : null,
          usageLog,
        );
        markdownStatus = markdownResult.status;
        markdown = markdownResult.markdown;
        markdownValidationErrors = markdownResult.validationErrors;
      }

      const outcome: ExtractionOutcome = {
        structured_status: structuredStatus,
        structured_data: this.toJsonInput(structuredData),
        structured_raw_ai_output: this.toJsonInput(structuredRawAiOutput),
        structured_validation_errors: this.toJsonInput(structuredValidationErrors),
        structured_attempts: 1,
        markdown_status: markdownStatus,
        markdown,
        markdown_validation_errors: this.toJsonInput(markdownValidationErrors),
        ai_usage: this.toJsonInput(usageLog.length > 0 ? usageLog : null),
      };

      await this.persist(outcome, {
        workflowRunId: item.plain_scraped_page_id ? null : aiBatchJob.workflow_run_id,
        plainScrapedPageId: item.plain_scraped_page_id,
        extractionSchemaVersionId: aiBatchJob.workflow_run.extraction_schema_version_id,
      });

      await this.prisma.aiBatchRequestItem.update({
        where: { id: item.id },
        data: { status: structuredStatus },
      });

      results.push({ item, outcome });
    }

    return { items: results };
  }

  /** Shared SUCCESS/PARTIAL_SUCCESS/FAILED derivation used by the batch-completion path. */
  deriveRunStatus(outcome: ExtractionOutcome, outputFormats: OutputFormat[]): RunStatus {
    const wantsStructured = outputFormats.includes(OutputFormat.STRUCTURED_JSON);
    const wantsMarkdown = outputFormats.includes(OutputFormat.MARKDOWN);

    const structuredOk =
      !wantsStructured || outcome.structured_status === ExtractionFormatStatus.VALID;
    const markdownOk =
      !wantsMarkdown || outcome.markdown_status === ExtractionFormatStatus.VALID;

    if (structuredOk && markdownOk) return RunStatus.SUCCESS;
    if (structuredOk || markdownOk) return RunStatus.PARTIAL_SUCCESS;
    return RunStatus.FAILED;
  }

  private parseBatchOutputLines(
    raw: string,
    outputByCustomId: Map<string, { content?: string; error?: string }>,
  ): void {
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const customId = parsed.custom_id as string;
        if (!customId) continue;

        if (parsed.error) {
          outputByCustomId.set(customId, {
            error: parsed.error.message ?? 'Batch request failed',
          });
          continue;
        }

        const content = parsed.response?.body?.choices?.[0]?.message?.content;
        outputByCustomId.set(customId, {
          content: typeof content === 'string' ? content : undefined,
          error: typeof content === 'string' ? undefined : 'Batch response had no message content',
        });
      } catch (error) {
        this.logger.warn(
          `Failed to parse a line of the OpenAI batch output file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private parseBatchErrorLines(
    raw: string,
    outputByCustomId: Map<string, { content?: string; error?: string }>,
  ): void {
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const customId = parsed.custom_id as string;
        if (!customId) continue;
        outputByCustomId.set(customId, {
          error: parsed.error?.message ?? 'Batch request failed',
        });
      } catch (error) {
        this.logger.warn(
          `Failed to parse a line of the OpenAI batch error file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async runStructuredExtraction(
    request: ExtractionRequest,
    contentLabel: string,
    usageLog: AiUsageEntry[],
  ): Promise<{
    status: ExtractionFormatStatus;
    data: unknown;
    rawAiOutput: string | null;
    validationErrors: unknown;
    attempts: number;
  }> {
    if (!request.schemaDefinition || Object.keys(request.schemaDefinition).length === 0) {
      return {
        status: ExtractionFormatStatus.FAILED,
        data: null,
        rawAiOutput: null,
        validationErrors: { message: 'No extraction schema configured for STRUCTURED_JSON output' },
        attempts: 0,
      };
    }

    const { regexFields, remainingDefinition } = splitRegexFields(request.schemaDefinition);
    const regexData =
      Object.keys(regexFields).length > 0
        ? extractRegexFieldValues(regexFields, request.regexContent ?? request.content)
        : {};

    if (Object.keys(remainingDefinition).length === 0) {
      // Every field was a "regex" descriptor — extracted deterministically above,
      // no LLM call needed.
      return {
        status: ExtractionFormatStatus.VALID,
        data: regexData,
        rawAiOutput: null,
        validationErrors: null,
        attempts: 0,
      };
    }

    const zodSchema = buildOutputZodSchema(remainingDefinition);
    const basePrompt = buildStructuredExtractionPrompt({
      content: request.content,
      contentLabel,
      instructions: request.instructions,
      sourceUrl: request.sourceUrl,
    });

    let lastRawText: string | undefined;
    let lastValidationError: unknown;
    let lastErrorKind: 'no_object_generated' | 'unknown' = 'unknown';
    let attempts = 0;

    for (attempts = 1; attempts <= MAX_STRUCTURED_ATTEMPTS; attempts++) {
      const prompt =
        attempts === 1
          ? basePrompt
          : buildStructuredCorrectionPrompt({
              basePrompt,
              previousRawOutput: lastRawText,
              validationErrorMessage: this.stringifyError(lastValidationError),
            });

      try {
        const { response, usage } = await this.aiService.generateTextWithSchemaForUser(
          request.userId,
          {
            prompt,
            system: STRUCTURED_EXTRACTION_SYSTEM_PROMPT,
            schema: zodSchema,
          },
        );

        if (usage) {
          usageLog.push({ stage: 'structured', attempt: attempts, usage });
        }

        return {
          status: ExtractionFormatStatus.VALID,
          data: { ...regexData, ...(response as Record<string, unknown>) },
          rawAiOutput: JSON.stringify(response),
          validationErrors: null,
          attempts,
        };
      } catch (error) {
        if (error instanceof AiGenerationError) {
          lastRawText = error.rawText;
          lastValidationError = error.validationError ?? error.message;
          lastErrorKind = error.kind;
          if (error.usage) {
            usageLog.push({ stage: 'structured', attempt: attempts, usage: error.usage });
          }
          this.logger.warn(
            `Structured extraction attempt ${attempts}/${MAX_STRUCTURED_ATTEMPTS} failed: ${error.message}`,
          );
        } else {
          lastValidationError = error instanceof Error ? error.message : String(error);
          lastErrorKind = 'unknown';
          this.logger.error(
            `Structured extraction attempt ${attempts}/${MAX_STRUCTURED_ATTEMPTS} threw an unexpected error`,
            error instanceof Error ? error.stack : undefined,
          );
          // Infrastructure-level failures (missing credentials, network, etc.) won't be fixed
          // by retrying with a corrective prompt — stop early.
          break;
        }
      }
    }

    return {
      status:
        lastErrorKind === 'no_object_generated'
          ? ExtractionFormatStatus.INVALID
          : ExtractionFormatStatus.FAILED,
      data: null,
      rawAiOutput: lastRawText ?? null,
      validationErrors: this.describeValidationError(lastValidationError),
      attempts,
    };
  }

  private async runMarkdownNormalization(
    request: ExtractionRequest,
    contentLabel: string,
    validStructuredData: unknown,
    usageLog: AiUsageEntry[],
  ): Promise<{
    status: ExtractionFormatStatus;
    markdown: string | null;
    validationErrors: unknown;
  }> {
    const prompt = validStructuredData
      ? buildMarkdownFromStructuredPrompt({
          structuredData: validStructuredData,
          content: request.content,
          contentLabel,
          instructions: request.instructions,
          sourceUrl: request.sourceUrl,
        })
      : buildMarkdownFromRawContentPrompt({
          content: request.content,
          contentLabel,
          instructions: request.instructions,
          sourceUrl: request.sourceUrl,
        });

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_MARKDOWN_ATTEMPTS; attempt++) {
      try {
        const { response, usage } = await this.aiService.generateTextForUser(request.userId, {
          prompt,
          system: MARKDOWN_NORMALIZATION_SYSTEM_PROMPT,
        });

        if (usage) {
          usageLog.push({ stage: 'markdown', attempt, usage });
        }

        const trimmed = response?.trim();
        if (trimmed) {
          return { status: ExtractionFormatStatus.VALID, markdown: trimmed, validationErrors: null };
        }

        lastError = 'Model returned an empty Markdown document';
        this.logger.warn(
          `Markdown normalization attempt ${attempt}/${MAX_MARKDOWN_ATTEMPTS} returned empty output`,
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Markdown normalization attempt ${attempt}/${MAX_MARKDOWN_ATTEMPTS} failed: ${lastError}`,
        );
      }
    }

    return {
      status: ExtractionFormatStatus.FAILED,
      markdown: null,
      validationErrors: this.describeValidationError(lastError),
    };
  }

  private stringifyError(error: unknown): string {
    if (error == null) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private describeValidationError(error: unknown): unknown {
    if (error == null) return null;
    if (typeof error === 'string') return { message: error };
    if (error instanceof Error) {
      const zodIssues = (error as { issues?: unknown }).issues;
      return {
        message: error.message,
        ...(zodIssues ? { issues: zodIssues } : {}),
      };
    }
    return error;
  }

  private toJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  }
}

export type { AICostResponse };
