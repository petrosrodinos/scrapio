import { OutputFormat } from 'generated/prisma';

const STRUCTURED_ONLY_FIELDS = [
  'structured_status',
  'structured_data',
  'structured_raw_ai_output',
  'structured_validation_errors',
  'structured_attempts',
  'generated_ui_html',
] as const;

const MARKDOWN_ONLY_FIELDS = [
  'markdown_status',
  'markdown',
  'markdown_validation_errors',
] as const;

/**
 * Strips ExtractionResult fields for formats that weren't in the run's output_formats
 * contract before the result is serialized to an API or webhook response. Without this,
 * every ExtractionResult row carries both structured_* and markdown_* keys regardless of
 * what was requested, so a MARKDOWN-only run still surfaces a `structured_data` key (even
 * though it's null and was never generated) alongside `markdown`.
 */
export function sanitizeExtractionResultForOutputFormats<
  T extends Record<string, unknown> | null | undefined,
>(result: T, outputFormats: OutputFormat[]): T {
  if (!result) return result;

  const wantsStructured = outputFormats.includes(OutputFormat.STRUCTURED_JSON);
  const wantsMarkdown = outputFormats.includes(OutputFormat.MARKDOWN);

  const sanitized: Record<string, unknown> = { ...result };

  if (!wantsStructured) {
    for (const field of STRUCTURED_ONLY_FIELDS) delete sanitized[field];
  }
  if (!wantsMarkdown) {
    for (const field of MARKDOWN_ONLY_FIELDS) delete sanitized[field];
  }

  return sanitized as T;
}
