const MAX_CONTENT_CHARS = 60_000;

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return `${content.slice(0, MAX_CONTENT_CHARS)}\n\n... [truncated, ${content.length - MAX_CONTENT_CHARS} more characters omitted]`;
}

export const STRUCTURED_EXTRACTION_SYSTEM_PROMPT = `You are a precise data-extraction assistant. You are given raw evidence collected from a website (HTML, cleaned text, or notes from a browsing session) and must extract structured data matching the requested schema exactly.

Rules:
- Only use information present in the provided evidence. Never invent values.
- If a field's value is genuinely absent from the evidence and the field is not required, omit it or use null where the schema allows.
- Preserve original values verbatim (numbers, dates, names) — do not reformat, translate, or summarize field values unless the field description asks for that.
- Return ONLY the structured data — no prose, no explanations outside the schema.`;

export function buildStructuredExtractionPrompt(params: {
  content: string;
  contentLabel: string;
  instructions?: string | null;
  sourceUrl?: string | null;
}): string {
  const { content, contentLabel, instructions, sourceUrl } = params;

  const parts = [
    sourceUrl ? `Source URL: ${sourceUrl}` : null,
    instructions ? `Task context / instructions:\n${instructions}` : null,
    `${contentLabel}:\n"""\n${truncateContent(content)}\n"""`,
    'Extract the data described by the provided schema from the evidence above.',
  ].filter(Boolean);

  return parts.join('\n\n');
}

export function buildStructuredCorrectionPrompt(params: {
  basePrompt: string;
  previousRawOutput?: string;
  validationErrorMessage: string;
}): string {
  const { basePrompt, previousRawOutput, validationErrorMessage } = params;

  return [
    basePrompt,
    previousRawOutput
      ? `Your previous response was:\n"""\n${previousRawOutput}\n"""`
      : 'Your previous response could not be parsed.',
    `That response was invalid: ${validationErrorMessage}`,
    'Correct the response so it strictly matches the required schema. Return ONLY the corrected structured data.',
  ].join('\n\n');
}

export const MARKDOWN_NORMALIZATION_SYSTEM_PROMPT = `You are a content-normalization assistant. You convert raw evidence collected from a website into clean, well-structured Markdown for human reading.

Rules:
- Preserve all meaningful information from the evidence; do not invent facts.
- Use Markdown headings, lists, tables, and links where they improve readability.
- Strip navigation chrome, ads, cookie banners, and boilerplate that isn't part of the actual content.
- Return ONLY the Markdown document — no commentary about what you did.`;

export function buildMarkdownFromStructuredPrompt(params: {
  structuredData: unknown;
  content: string;
  contentLabel: string;
  instructions?: string | null;
  sourceUrl?: string | null;
}): string {
  const { structuredData, content, contentLabel, instructions, sourceUrl } = params;

  const parts = [
    sourceUrl ? `Source URL: ${sourceUrl}` : null,
    instructions ? `Task context / instructions:\n${instructions}` : null,
    `Extracted structured data:\n"""\n${JSON.stringify(structuredData, null, 2)}\n"""`,
    `Original ${contentLabel} (for additional context/detail not captured in the structured data):\n"""\n${truncateContent(content)}\n"""`,
    'Produce a single well-formatted Markdown document summarizing this content.',
  ].filter(Boolean);

  return parts.join('\n\n');
}

export function buildMarkdownFromRawContentPrompt(params: {
  content: string;
  contentLabel: string;
  instructions?: string | null;
  sourceUrl?: string | null;
}): string {
  const { content, contentLabel, instructions, sourceUrl } = params;

  const parts = [
    sourceUrl ? `Source URL: ${sourceUrl}` : null,
    instructions ? `Task context / instructions:\n${instructions}` : null,
    `${contentLabel}:\n"""\n${truncateContent(content)}\n"""`,
    'Produce a single well-formatted Markdown document summarizing this content.',
  ].filter(Boolean);

  return parts.join('\n\n');
}
