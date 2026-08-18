/**
 * Built-in regex patterns for "regex" extraction fields, used by both the
 * CSS-selector scraper (FieldDef.type "regex") and the structured-output
 * schema (descriptor type "regex"). A field's `pattern` is looked up here
 * (case-insensitively) first; if it isn't a known preset name, it's used as
 * a raw regex source string instead.
 */
export const REGEX_PRESETS: Record<string, string> = {
  email: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  // Two alternatives, matched against raw HTML:
  //  1. `tel:` links — high-confidence context, so digits are matched loosely
  //     (capture group 1 strips the "tel:" prefix from the result).
  //  2. Grouped phone-shaped text: a 1-4 digit leading group (country/area
  //     code) followed by 2-3 more digit groups, each introduced by its own
  //     separator, with the whole thing required to contain at least one
  //     "+", "(", ")" or "-" (not just bare spaces). That combination is
  //     what keeps this from matching the digit/space soup that fills raw
  //     HTML — SVG `viewBox`/`d` values (e.g. "0 0 24 24"), decimal
  //     coordinate pairs (e.g. "6.92474 18.1137"), bare asset hashes/version
  //     numbers (e.g. "13971731025"), and space-separated dimension lists
  //     (e.g. "640 750 828 1080") all fail it — none have the required
  //     separator structure, or they use only plain spaces between groups.
  //     A `(?<!\d)`/`(?!\d)` guard also stops it from grabbing a slice out of
  //     the middle of an unrelated longer digit run. It's still a heuristic:
  //     dash-separated dates (e.g. "2026-08-17") can slip through, and a
  //     parenthesized area code glued directly to an unformatted trailing
  //     block (e.g. "(030) 6941234567") won't match — deliberate trade-offs
  //     to avoid the false positives above.
  phone:
    'tel:\\s*(\\+?[\\d\\s\\-.()]{7,}\\d)|(?<!\\d)(?=[\\d\\s()+-]{0,24}?[()+-])\\+?\\(?\\d{1,4}\\)?(?:[\\s\\-]{1,2}\\(?\\d{2,4}\\)?){2,3}(?!\\d)',
  url: 'https?:\\/\\/[^\\s"\'<>]+',
};

export function resolveRegexPattern(pattern: string): string {
  return REGEX_PRESETS[pattern.toLowerCase().trim()] ?? pattern;
}

export const RegexPresets = {
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
} as const;

export type RegexPreset = (typeof RegexPresets)[keyof typeof RegexPresets];

export function isBuiltInRegexPreset(pattern: string): pattern is RegexPreset {
  return Object.prototype.hasOwnProperty.call(
    REGEX_PRESETS,
    pattern.toLowerCase().trim(),
  );
}
