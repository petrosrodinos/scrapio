import { Injectable, Logger } from '@nestjs/common';
import { ExtractionFormatStatus, ExtractionResult, OutputFormat, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { AiGenerationError, AICostResponse } from '@/integrations/ai/interfaces/ai.interface';
import { buildOutputZodSchema } from '@/shared/utils/schema/schema-definition-to-zod.util';
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
