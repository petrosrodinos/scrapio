import { ExtractionFormatStatus, OutputFormat, Prisma } from 'generated/prisma';
import { AICostResponse } from '@/integrations/ai/interfaces/ai.interface';

export interface ExtractionRequest {
  userId: string;
  outputFormats: OutputFormat[];
  /** Raw evidence to extract from: HTML, cleaned text, or serialized browser-agent findings. */
  content: string;
  /** Human-readable label for what `content` is, used to phrase the prompt (e.g. "page HTML"). */
  contentLabel?: string;
  /** Free-text task context appended to the prompt (e.g. generation_prompt, user task description). */
  instructions?: string | null;
  /** Required when STRUCTURED_JSON is requested. */
  schemaDefinition?: Record<string, unknown> | null;
  sourceUrl?: string | null;
}

export interface AiUsageEntry {
  stage: 'structured' | 'markdown';
  attempt: number;
  usage: AICostResponse;
}

export interface ExtractionOutcome {
  structured_status: ExtractionFormatStatus | null;
  structured_data: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  structured_raw_ai_output: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  structured_validation_errors: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  structured_attempts: number;
  markdown_status: ExtractionFormatStatus | null;
  markdown: string | null;
  markdown_validation_errors: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  ai_usage: Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

export const MAX_STRUCTURED_ATTEMPTS = 3;
export const MAX_MARKDOWN_ATTEMPTS = 2;
