import { ExtractionFormatStatus, OutputFormat, Prisma } from 'generated/prisma';
import { AICostResponse } from '@/integrations/ai/interfaces/ai.interface';

export interface ExtractionRequest {
  userId: string;
  outputFormats: OutputFormat[];
  /** Raw evidence to extract from: HTML, cleaned text, or serialized browser-agent findings. */
  content: string;
  /**
   * Source text for "regex" schema fields, matched deterministically without an
   * LLM call. Defaults to `content` when omitted; pass raw HTML here when
   * `content` is a stripped/cleaned version, so patterns can still match things
   * like emails only present in `mailto:` hrefs.
   */
  regexContent?: string | null;
  /** Human-readable label for what `content` is, used to phrase the prompt (e.g. "page HTML"). */
  contentLabel?: string;
  /** Free-text task context appended to the prompt (e.g. generation_prompt, user task description). */
  instructions?: string | null;
  /** Required when STRUCTURED_JSON is requested. */
  schemaDefinition?: Record<string, unknown> | null;
  sourceUrl?: string | null;
}

export interface AiUsageEntry {
  stage: 'structured' | 'markdown' | 'ui_generation';
  attempt: number;
  usage: AICostResponse;
}

/** One structured-extraction request to submit as a line item in an OpenAI batch. */
export interface BatchExtractionItem {
  content: string;
  regexContent?: string | null;
  contentLabel?: string;
  instructions?: string | null;
  sourceUrl?: string | null;
  /** Set only for a PLAIN_SCRAPE PER_URL page-level item; omitted for run-level items. */
  plainScrapedPageId?: string | null;
  wantsMarkdown: boolean;
}

export interface ExtractionOutcome {
  structured_status: ExtractionFormatStatus | null;
  structured_data: Prisma.InputJsonValue | typeof Prisma.DbNull;
  structured_raw_ai_output: Prisma.InputJsonValue | typeof Prisma.DbNull;
  structured_validation_errors: Prisma.InputJsonValue | typeof Prisma.DbNull;
  structured_attempts: number;
  markdown_status: ExtractionFormatStatus | null;
  markdown: string | null;
  markdown_validation_errors: Prisma.InputJsonValue | typeof Prisma.DbNull;
  ai_usage: Prisma.InputJsonValue | typeof Prisma.DbNull;
}

export const MAX_STRUCTURED_ATTEMPTS = 3;
export const MAX_MARKDOWN_ATTEMPTS = 2;
