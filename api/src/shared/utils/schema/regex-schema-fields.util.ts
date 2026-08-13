import { resolveRegexPattern } from '@/shared/constants/regex-presets.constants';

export interface RegexFieldDescriptor {
  pattern: string;
  flags?: string;
}

function isRegexDescriptor(
  value: unknown,
): value is { type: 'regex'; pattern: string; flags?: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).type === 'regex'
  );
}

/**
 * Splits a top-level output schema definition into deterministic regex fields
 * (descriptor `{ type: "regex", pattern, flags? }`) and the remaining
 * definition to hand to the LLM. Only top-level fields are considered — a
 * regex descriptor nested inside an object/array is extracted by the LLM like
 * any other string, since this is a per-field bypass of the LLM call, not a
 * schema-wide transform.
 */
export function splitRegexFields(definition: Record<string, unknown>): {
  regexFields: Record<string, RegexFieldDescriptor>;
  remainingDefinition: Record<string, unknown>;
} {
  const regexFields: Record<string, RegexFieldDescriptor> = {};
  const remainingDefinition: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(definition)) {
    if (isRegexDescriptor(value)) {
      regexFields[key] = {
        pattern: value.pattern,
        flags: typeof value.flags === 'string' ? value.flags : undefined,
      };
      continue;
    }
    remainingDefinition[key] = value;
  }

  return { regexFields, remainingDefinition };
}

export function extractRegexFieldValues(
  regexFields: Record<string, RegexFieldDescriptor>,
  content: string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [key, { pattern, flags }] of Object.entries(regexFields)) {
    result[key] = matchAllUnique(content, pattern, flags);
  }

  return result;
}

function matchAllUnique(content: string, pattern: string, flags?: string): string[] {
  try {
    const source = resolveRegexPattern(pattern);
    const finalFlags = flags?.includes('g') ? flags : `${flags ?? ''}g`;
    const regex = new RegExp(source, finalFlags);
    const matches = [...content.matchAll(regex)].map((m) => (m[1] ?? m[0]).trim());
    return [...new Set(matches)].filter(Boolean);
  } catch {
    return [];
  }
}
