import { z } from 'zod';
import { resolveRegexPattern } from '@/shared/constants/regex-presets.constants';
import {
  DescriptorBaseTypes,
  OutputSchemaDefinition,
  PrimitiveSchemaTypes,
} from '../interfaces/output-schema.interface';

const PRIMITIVE_SCHEMA_TYPES = Object.values(PrimitiveSchemaTypes);

const PRIMITIVE_SCHEMA_TYPE_SET = new Set<string>(PRIMITIVE_SCHEMA_TYPES);

const DESCRIPTOR_BASE_TYPES = Object.values(DescriptorBaseTypes);

const DESCRIPTOR_BASE_TYPE_SET = new Set<string>(DESCRIPTOR_BASE_TYPES);

const SUPPORTED_SCHEMA_TYPE_HINT = `${PRIMITIVE_SCHEMA_TYPES.join(', ')}, a string enum (["a", "b"]), a number enum ([1, 2]), a nested object ({ ... }), an object array ([{ ... }]), or a rich descriptor ({ type, description?, required?, nullable?, enum?, pattern?, flags?, minimum?, maximum?, minLength?, maxLength?, items?, properties? })`;

function formatSchemaPath(path: PropertyKey[]): string {
  return path.map(String).join('.');
}

function labelFor(path: PropertyKey[]): string {
  return path.length > 0 ? `"${formatSchemaPath(path)}"` : 'root';
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

function validateEnumArray(value: unknown[], path: PropertyKey[]): string | null {
  const label = labelFor(path);

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

  return `Invalid schema at ${label}: enum must be a string array or a number array`;
}

/**
 * A "rich descriptor" is a plain object carrying an explicit `type` key
 * (one of DESCRIPTOR_BASE_TYPES), as opposed to shorthand nested-object
 * syntax where every key is a free-form field name mapping to a nested
 * schema value.
 */
function isRichDescriptorCandidate(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { type: string } {
  return typeof value.type === 'string';
}

function validateRichDescriptor(
  value: Record<string, unknown> & { type: string },
  path: PropertyKey[],
): string | null {
  const label = labelFor(path);
  const { type } = value;

  if (!DESCRIPTOR_BASE_TYPE_SET.has(type)) {
    return `Invalid schema at ${label}: descriptor "type" must be one of ${DESCRIPTOR_BASE_TYPES.join(', ')}`;
  }

  const allowedKeys = new Set([
    'type',
    'description',
    'required',
    'nullable',
    'enum',
    'pattern',
    'flags',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'items',
    'properties',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      return `Invalid schema at ${label}: unknown descriptor field "${key}"`;
    }
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    return `Invalid schema at ${label}: "description" must be a string`;
  }
  if (value.required !== undefined && typeof value.required !== 'boolean') {
    return `Invalid schema at ${label}: "required" must be a boolean`;
  }
  if (value.nullable !== undefined && typeof value.nullable !== 'boolean') {
    return `Invalid schema at ${label}: "nullable" must be a boolean`;
  }

  if (value.enum !== undefined) {
    if (!Array.isArray(value.enum)) {
      return `Invalid schema at ${label}: "enum" must be an array`;
    }
    if (type !== 'string' && type !== 'number' && type !== 'integer') {
      return `Invalid schema at ${label}: "enum" is only supported for string/number/integer types`;
    }
    const enumError = validateEnumArray(value.enum, path);
    if (enumError) return enumError;
  }

  if (type === 'regex' && value.pattern === undefined) {
    return `Invalid schema at ${label}: "regex" descriptor requires "pattern"`;
  }

  if (value.pattern !== undefined) {
    if (type !== 'string' && type !== 'regex') {
      return `Invalid schema at ${label}: "pattern" is only supported for string/regex types`;
    }
    if (typeof value.pattern !== 'string') {
      return `Invalid schema at ${label}: "pattern" must be a string`;
    }
    try {
      new RegExp(type === 'regex' ? resolveRegexPattern(value.pattern) : value.pattern);
    } catch {
      return `Invalid schema at ${label}: "pattern" is not a valid regular expression`;
    }
  }

  if (value.flags !== undefined) {
    if (type !== 'regex') {
      return `Invalid schema at ${label}: "flags" is only supported for regex type`;
    }
    if (typeof value.flags !== 'string') {
      return `Invalid schema at ${label}: "flags" must be a string`;
    }
    try {
      new RegExp('', value.flags);
    } catch {
      return `Invalid schema at ${label}: "flags" is not a valid set of regex flags`;
    }
  }

  if (value.minimum !== undefined || value.maximum !== undefined) {
    if (type !== 'number' && type !== 'integer') {
      return `Invalid schema at ${label}: "minimum"/"maximum" are only supported for number/integer types`;
    }
    if (value.minimum !== undefined && typeof value.minimum !== 'number') {
      return `Invalid schema at ${label}: "minimum" must be a number`;
    }
    if (value.maximum !== undefined && typeof value.maximum !== 'number') {
      return `Invalid schema at ${label}: "maximum" must be a number`;
    }
  }

  if (value.minLength !== undefined || value.maxLength !== undefined) {
    if (type !== 'string' && type !== 'array') {
      return `Invalid schema at ${label}: "minLength"/"maxLength" are only supported for string/array types`;
    }
    if (value.minLength !== undefined && typeof value.minLength !== 'number') {
      return `Invalid schema at ${label}: "minLength" must be a number`;
    }
    if (value.maxLength !== undefined && typeof value.maxLength !== 'number') {
      return `Invalid schema at ${label}: "maxLength" must be a number`;
    }
  }

  if (type === 'array') {
    if (value.items === undefined) {
      return `Invalid schema at ${label}: array descriptor requires "items"`;
    }
    return validateOutputSchemaDefinitionValue(value.items, [...path, 'items']);
  }

  if (type === 'object') {
    if (
      value.properties === undefined ||
      typeof value.properties !== 'object' ||
      Array.isArray(value.properties) ||
      value.properties === null
    ) {
      return `Invalid schema at ${label}: object descriptor requires a "properties" object`;
    }
    return validateOutputSchemaDefinitionObject(
      value.properties as Record<string, unknown>,
      [...path, 'properties'],
    );
  }

  return null;
}

function validateEnumOrObjectArray(
  value: unknown[],
  path: PropertyKey[],
): string | null {
  const label = labelFor(path);

  if (value.length === 0) {
    return `Invalid schema at ${label}: enum arrays must contain at least one value`;
  }

  if (isStringEnumArray(value) || isNumberEnumArray(value)) {
    return validateEnumArray(value, path);
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
  const label = labelFor(path);

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
    const record = value as Record<string, unknown>;
    if (isRichDescriptorCandidate(record)) {
      return validateRichDescriptor(record, path);
    }
    return validateOutputSchemaDefinitionObject(record, path);
  }

  return `Invalid schema at ${label}: expected ${SUPPORTED_SCHEMA_TYPE_HINT}`;
}

function validateOutputSchemaDefinitionObject(
  value: Record<string, unknown>,
  path: PropertyKey[],
): string | null {
  const entries = Object.entries(value);
  const label = labelFor(path);

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

export const outputSchemaDefinitionSchema: z.ZodType<OutputSchemaDefinition> = z
  .record(z.unknown())
  .superRefine((value, ctx) => {
    const error = getOutputSchemaDefinitionError(value);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      });
    }
  }) as z.ZodType<OutputSchemaDefinition>;
