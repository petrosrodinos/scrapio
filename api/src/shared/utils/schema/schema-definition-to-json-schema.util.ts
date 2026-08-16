type SchemaDefinitionValue = unknown;

interface JsonSchemaNode {
  type?: string | string[];
  description?: string;
  enum?: (string | number)[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

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

function applyDescription(
  node: JsonSchemaNode,
  descriptor: Record<string, unknown>,
): JsonSchemaNode {
  if (typeof descriptor.description === 'string') {
    node.description = descriptor.description;
  }
  // OpenAI's strict Structured Outputs mode requires every property to be listed in the
  // object's `required` array — there's no concept of a truly optional field. A field marked
  // nullable or non-required here is instead modeled as "the model may return null for it".
  if (
    (descriptor.nullable === true || descriptor.required === false) &&
    node.type &&
    typeof node.type === 'string'
  ) {
    node.type = [node.type, 'null'];
  }
  return node;
}

function buildRichDescriptorJsonSchema(
  descriptor: Record<string, unknown> & { type: string },
): JsonSchemaNode {
  const { type } = descriptor;
  let node: JsonSchemaNode;

  switch (type) {
    case 'string': {
      if (
        Array.isArray(descriptor.enum) &&
        isStringEnumArray(descriptor.enum)
      ) {
        node = { type: 'string', enum: descriptor.enum };
      } else {
        node = { type: 'string' };
        if (typeof descriptor.pattern === 'string')
          node.pattern = descriptor.pattern;
        if (typeof descriptor.minLength === 'number')
          node.minLength = descriptor.minLength;
        if (typeof descriptor.maxLength === 'number')
          node.maxLength = descriptor.maxLength;
      }
      break;
    }
    case 'number': {
      if (
        Array.isArray(descriptor.enum) &&
        isNumberEnumArray(descriptor.enum)
      ) {
        node = { type: 'number', enum: descriptor.enum };
      } else {
        node = { type: 'number' };
        if (typeof descriptor.minimum === 'number')
          node.minimum = descriptor.minimum;
        if (typeof descriptor.maximum === 'number')
          node.maximum = descriptor.maximum;
      }
      break;
    }
    case 'integer': {
      if (
        Array.isArray(descriptor.enum) &&
        isNumberEnumArray(descriptor.enum)
      ) {
        node = { type: 'integer', enum: descriptor.enum };
      } else {
        node = { type: 'integer' };
        if (typeof descriptor.minimum === 'number')
          node.minimum = descriptor.minimum;
        if (typeof descriptor.maximum === 'number')
          node.maximum = descriptor.maximum;
      }
      break;
    }
    case 'boolean':
      node = { type: 'boolean' };
      break;
    case 'array':
      node = {
        type: 'array',
        items: buildJsonSchemaForValue(descriptor.items),
      };
      break;
    case 'object':
      node = buildObjectJsonSchema(
        (descriptor.properties ?? {}) as Record<string, unknown>,
      );
      break;
    case 'regex':
      // Only extracted deterministically at the top level (see splitRegexFields); nested here
      // just as a schema fallback so the model still produces a coherent string[] shape for it.
      node = { type: 'array', items: { type: 'string' } };
      break;
    default:
      node = {};
  }

  return applyDescription(node, descriptor);
}

function buildJsonSchemaForValue(value: SchemaDefinitionValue): JsonSchemaNode {
  if (typeof value === 'string') {
    switch (value) {
      case 'string':
        return { type: 'string' };
      case 'number':
        return { type: 'number' };
      case 'integer':
        return { type: 'integer' };
      case 'boolean':
        return { type: 'boolean' };
      case 'string[]':
        return { type: 'array', items: { type: 'string' } };
      case 'number[]':
        return { type: 'array', items: { type: 'number' } };
      case 'boolean[]':
        return { type: 'array', items: { type: 'boolean' } };
      default:
        return {};
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} };

    if (isStringEnumArray(value) || isNumberEnumArray(value)) {
      return { enum: value };
    }

    if (
      value.length === 1 &&
      value[0] &&
      typeof value[0] === 'object' &&
      !Array.isArray(value[0])
    ) {
      return {
        type: 'array',
        items: buildObjectJsonSchema(value[0] as Record<string, unknown>),
      };
    }

    return { type: 'array', items: {} };
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isRichDescriptor(record)) {
      return buildRichDescriptorJsonSchema(record);
    }
    return buildObjectJsonSchema(record);
  }

  return {};
}

function buildObjectJsonSchema(
  definition: Record<string, unknown>,
): JsonSchemaNode {
  const properties: Record<string, JsonSchemaNode> = {};

  for (const [key, value] of Object.entries(definition)) {
    properties[key] = buildJsonSchemaForValue(value);
  }

  return {
    type: 'object',
    properties,
    // Strict mode mandates every property be required — optionality is expressed via
    // nullability instead (see applyDescription).
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/**
 * Converts an app-level output schema definition (shorthand strings/arrays, or rich
 * `{ type, ... }` descriptors — see schema-definition-to-zod.util.ts for the accepted shapes,
 * which this mirrors) into a plain JSON Schema object usable with OpenAI's strict Structured
 * Outputs `response_format: { type: "json_schema", json_schema: { schema, strict: true } }`.
 */
export function buildOutputJsonSchema(
  definition: Record<string, unknown>,
): JsonSchemaNode {
  return buildObjectJsonSchema(definition);
}
