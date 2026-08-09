import { z } from 'zod';

const PRIMITIVE_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'string[]',
  'number[]',
  'boolean[]',
] as const;

const PRIMITIVE_SCHEMA_TYPE_SET = new Set<string>(PRIMITIVE_SCHEMA_TYPES);

const SUPPORTED_SCHEMA_TYPE_HINT = `${PRIMITIVE_SCHEMA_TYPES.join(', ')}, a string enum (["a", "b"]), a number enum ([1, 2]), a nested object ({ ... }), or an object array ([{ ... }])`;

function formatSchemaPath(path: PropertyKey[]): string {
  return path.map(String).join('.');
}

function isStringEnumArray(value: unknown[]): value is string[] {
  return value.length > 0 && value.every((item) => typeof item === 'string');
}

function isNumberEnumArray(value: unknown[]): value is number[] {
  return (
    value.length > 0 &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function validateEnumOrObjectArray(
  value: unknown[],
  path: PropertyKey[],
): string | null {
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : 'root';

  if (value.length === 0) {
    return `Invalid schema at ${label}: enum arrays must contain at least one value`;
  }

  if (isStringEnumArray(value)) {
    if (value.some((item) => !item.trim())) {
      return `Invalid schema at ${label}: string enum values cannot be empty`;
    }
    if (new Set(value).size !== value.length) {
      return `Invalid schema at ${label}: enum values must be unique`;
    }
    return null;
  }

  if (isNumberEnumArray(value)) {
    if (new Set(value).size !== value.length) {
      return `Invalid schema at ${label}: enum values must be unique`;
    }
    return null;
  }

  if (
    value.length === 1 &&
    value[0] &&
    typeof value[0] === 'object' &&
    !Array.isArray(value[0])
  ) {
    return validateOutputSchemaDefinitionObject(
      value[0] as Record<string, unknown>,
      path,
    );
  }

  return `Invalid schema at ${label}: arrays must be a string enum (["a", "b"]), a number enum ([1, 2]), or an object array ([{ ... }])`;
}

function validateOutputSchemaDefinitionValue(
  value: unknown,
  path: PropertyKey[],
): string | null {
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : 'root';

  if (typeof value === 'string') {
    if (!PRIMITIVE_SCHEMA_TYPE_SET.has(value)) {
      return `Invalid schema at ${label}: "${value}" is not a supported schema type. Use ${SUPPORTED_SCHEMA_TYPE_HINT}`;
    }
    return null;
  }

  if (Array.isArray(value)) {
    return validateEnumOrObjectArray(value, path);
  }

  if (value && typeof value === 'object') {
    return validateOutputSchemaDefinitionObject(
      value as Record<string, unknown>,
      path,
    );
  }

  return `Invalid schema at ${label}: expected ${SUPPORTED_SCHEMA_TYPE_HINT}`;
}

function validateOutputSchemaDefinitionObject(
  value: Record<string, unknown>,
  path: PropertyKey[],
): string | null {
  const entries = Object.entries(value);
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : 'root';

  if (entries.length === 0) {
    return path.length === 0
      ? 'Output schema must contain at least one field'
      : `Invalid schema at ${label}: nested object must contain at least one field`;
  }

  for (const [key, nestedValue] of entries) {
    if (!key.trim()) {
      return `Invalid schema at ${label}: field names cannot be empty`;
    }

    const nestedError = validateOutputSchemaDefinitionValue(nestedValue, [
      ...path,
      key,
    ]);
    if (nestedError) {
      return nestedError;
    }
  }

  return null;
}

export function getOutputSchemaDefinitionError(
  value: unknown,
): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'Output schema must be a JSON object, not an array or primitive';
  }

  return validateOutputSchemaDefinitionObject(
    value as Record<string, unknown>,
    [],
  );
}

export const outputSchemaDefinitionSchema = z
  .record(z.unknown())
  .superRefine((value, ctx) => {
    const error = getOutputSchemaDefinitionError(value);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      });
    }
  });
