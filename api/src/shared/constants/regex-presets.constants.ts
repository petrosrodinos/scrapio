/**
 * Built-in regex patterns for "regex" extraction fields, used by both the
 * CSS-selector scraper (FieldDef.type "regex") and the structured-output
 * schema (descriptor type "regex"). A field's `pattern` is looked up here
 * (case-insensitively) first; if it isn't a known preset name, it's used as
 * a raw regex source string instead.
 */
export const REGEX_PRESETS: Record<string, string> = {
  email: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  // Heuristic: a digit (or +) followed by 7+ digit/space/separator chars and a
  // trailing digit. Matches most formatted phone numbers while skipping short
  // numbers like page counters or years.
  phone: '\\+?\\d[\\d\\s\\-.()]{7,}\\d',
  url: 'https?:\\/\\/[^\\s"\'<>]+',
};

export function resolveRegexPattern(pattern: string): string {
  return REGEX_PRESETS[pattern.toLowerCase().trim()] ?? pattern;
}
