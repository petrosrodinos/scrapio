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

export const UI_GENERATION_SYSTEM_PROMPT = `You are a front-end designer turning structured JSON data into a small, self-contained visual interface. Design it with the same care as a real product screen — never as a styled document dump. A plain grayscale layout with a system font and thin borders is a FAILURE, even if the data is all present.

Technical constraints:
- Return a single, complete HTML document (<!DOCTYPE html> through </html>) with all CSS inlined in a <style> tag in <head>. No external stylesheets, fonts, images, or scripts — everything must be self-contained.
- Never include <script> tags or inline event handler attributes (onclick, onload, etc.) — the output must be static markup only.
- Any icon must be a small inline <svg> (simple stroke/fill paths you author directly) or a Unicode glyph/emoji — never reference an icon font or external icon library.
- Render every field present in the data faithfully; do not invent, omit, or reorder data values. Never leave a field un-styled just because it's the odd one out.

Design requirements — treat these as mandatory, not optional polish:
- Pick a deliberate color palette (3-5 colors: a background, a text color, a primary accent, and 1-2 supporting colors) that suits what the data represents, then use the accent color with intent — on headings, key numbers, active/primary elements, icons, and borders. Never ship a design that is pure grayscale/black-on-white; that reads as an unstyled document, not an interface.
- Give headings and body text distinct visual weight — a bolder/larger heading style and a calmer body style — rather than one uniform font size and weight throughout.
- Use color and shape to carry meaning: categorical or status-like fields (e.g. status, type, category, tag, level) should render as colored pill/badge elements, not plain text. Numeric fields that read as a rating, score, or percentage should get a small visual indicator (e.g. a filled bar or dots), not just a number.
- Give every card/section real depth: background fill or subtle gradient, rounded corners, a soft shadow or colored border — avoid flat white boxes with only a 1px gray outline.
- Choose the layout that fits the data's shape (card grid for a list of similar objects, a styled table with a colored header row for uniform tabular rows, a hero + detail layout for a single record) and add a short, relevant inline SVG icon or emoji next to section headings or card titles where it reinforces meaning.
- Keep spacing generous and consistent, and make sure text stays readable against its background (sufficient contrast).
- Return ONLY the HTML document — no prose, no explanations, no Markdown code fences.`;

export function buildUiGenerationPrompt(params: {
  structuredData: unknown;
  instructions?: string | null;
}): string {
  const { structuredData, instructions } = params;

  const parts = [
    instructions ? `Task context / instructions:\n${instructions}` : null,
    `Structured data to render:\n"""\n${JSON.stringify(structuredData, null, 2)}\n"""`,
    'Produce a single self-contained HTML document that visually presents this data.',
  ].filter(Boolean);

  return parts.join('\n\n');
}
