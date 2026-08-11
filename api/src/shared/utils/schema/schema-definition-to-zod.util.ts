import { z } from 'zod';

type SchemaDefinitionValue = unknown;

function isRichDescriptor(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { type: string } {
  return typeof value.type === 'string';
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

function buildEnumZod(values: (string | number)[]): z.ZodTypeAny {
  const literals = values.map((v) => z.literal(v as never));
  if (literals.length === 1) {
    return literals[0];
  }
  return z.union(
    literals as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
  );
}

function applyStringConstraints(
  schema: z.ZodString,
  descriptor: Record<string, unknown>,
): z.ZodString {
  let result = schema;
  if (typeof descriptor.pattern === 'string') {
    result = result.regex(new RegExp(descriptor.pattern));
  }
  if (typeof descriptor.minLength === 'number') {
    result = result.min(descriptor.minLength);
  }
  if (typeof descriptor.maxLength === 'number') {
    result = result.max(descriptor.maxLength);
  }
  return result;
}

function applyNumberConstraints(
  schema: z.ZodNumber,
  descriptor: Record<string, unknown>,
): z.ZodNumber {
  let result = schema;
  if (typeof descriptor.minimum === 'number') {
    result = result.min(descriptor.minimum);
  }
  if (typeof descriptor.maximum === 'number') {
    result = result.max(descriptor.maximum);
  }
  return result;
}

function finalizeField(
  schema: z.ZodTypeAny,
  descriptor: Record<string, unknown>,
): z.ZodTypeAny {
  let result = schema;
  if (typeof descriptor.description === 'string') {
    result = result.describe(descriptor.description);
  }
  if (descriptor.nullable === true) {
    result = result.nullable();
  }
  if (descriptor.required === false) {
    result = result.optional();
  }
  return result;
}

function buildRichDescriptorZod(
  descriptor: Record<string, unknown> & { type: string },
): z.ZodTypeAny {
  const { type } = descriptor;
  let base: z.ZodTypeAny;

  switch (type) {
    case 'string': {
      if (Array.isArray(descriptor.enum) && isStringEnumArray(descriptor.enum)) {
        base = buildEnumZod(descriptor.enum);
      } else {
        base = applyStringConstraints(z.string(), descriptor);
      }
      break;
    }
    case 'number': {
      if (Array.isArray(descriptor.enum) && isNumberEnumArray(descriptor.enum)) {
        base = buildEnumZod(descriptor.enum);
      } else {
        base = applyNumberConstraints(z.number(), descriptor);
      }
      break;
    }
    case 'integer': {
      if (Array.isArray(descriptor.enum) && isNumberEnumArray(descriptor.enum)) {
        base = buildEnumZod(descriptor.enum);
      } else {
        base = applyNumberConstraints(z.number().int(), descriptor);
      }
      break;
    }
    case 'boolean':
      base = z.boolean();
      break;
    case 'array': {
      const itemSchema = buildSchemaForValue(descriptor.items);
      let arraySchema = z.array(itemSchema);
      if (typeof descriptor.minLength === 'number') {
        arraySchema = arraySchema.min(descriptor.minLength);
      }
      if (typeof descriptor.maxLength === 'number') {
        arraySchema = arraySchema.max(descriptor.maxLength);
      }
      base = arraySchema;
      break;
    }
    case 'object':
      base = buildObjectZod(
        (descriptor.properties ?? {}) as Record<string, unknown>,
      );
      break;
    default:
      base = z.unknown();
  }

  return finalizeField(base, descriptor);
}

function buildSchemaForValue(value: SchemaDefinitionValue): z.ZodTypeAny {
  if (typeof value === 'string') {
    switch (value) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'integer':
        return z.number().int();
      case 'boolean':
        return z.boolean();
      case 'string[]':
        return z.array(z.string());
      case 'number[]':
        return z.array(z.number());
      case 'boolean[]':
        return z.array(z.boolean());
      default:
        return z.unknown();
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return z.array(z.unknown());

    if (isStringEnumArray(value)) {
      return buildEnumZod(value);
    }
    if (isNumberEnumArray(value)) {
      return buildEnumZod(value);
    }
    if (
      value.length === 1 &&
      value[0] &&
      typeof value[0] === 'object' &&
      !Array.isArray(value[0])
    ) {
      return z.array(buildObjectZod(value[0] as Record<string, unknown>));
    }

    return z.array(z.unknown());
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isRichDescriptor(record)) {
      return buildRichDescriptorZod(record);
    }
    return buildObjectZod(record);
  }

  return z.unknown();
}

function buildObjectZod(definition: Record<string, unknown>): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, value] of Object.entries(definition)) {
    shape[key] = buildSchemaForValue(value);
  }

  return z.object(shape);
}

/**
 * Converts an app-level output schema definition (shorthand strings/arrays,
 * or rich `{ type, ... }` descriptors — see output-schema.schema.ts for the
 * accepted shapes) into a Zod object schema usable with the AI SDK's
 * `generateObject`.
 */
export function buildOutputZodSchema(
  definition: Record<string, unknown>,
): z.ZodTypeAny {
  return buildObjectZod(definition);
}
