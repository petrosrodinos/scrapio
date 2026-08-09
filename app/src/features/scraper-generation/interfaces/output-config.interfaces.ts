export const OutputFormats = {
  STRUCTURED_JSON: "STRUCTURED_JSON",
  MARKDOWN: "MARKDOWN",
} as const;

export type OutputFormat = (typeof OutputFormats)[keyof typeof OutputFormats];

export const SchemaFieldTypes = {
  STRING: "string",
  NUMBER: "number",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  STRING_ARRAY: "string[]",
  NUMBER_ARRAY: "number[]",
  BOOLEAN_ARRAY: "boolean[]",
  STRING_ENUM: "enum",
  NUMBER_ENUM: "number_enum",
  OBJECT: "object",
  OBJECT_ARRAY: "object[]",
} as const;

export type SchemaFieldType = (typeof SchemaFieldTypes)[keyof typeof SchemaFieldTypes];

export type OutputSchemaEnumValue = string | number;

export interface OutputSchemaField {
  name: string;
  type: SchemaFieldType;
  children?: OutputSchemaField[];
  enumValues?: OutputSchemaEnumValue[];
}

export type OutputSchemaDefinition = Record<string, unknown>;

export const OutputSchemaEditorModes = {
  BUILDER: "builder",
  JSON: "json",
} as const;

export type OutputSchemaEditorMode =
  (typeof OutputSchemaEditorModes)[keyof typeof OutputSchemaEditorModes];

export function isComplexSchemaFieldType(type: SchemaFieldType | string): boolean {
  return type === SchemaFieldTypes.OBJECT || type === SchemaFieldTypes.OBJECT_ARRAY;
}

export function isEnumSchemaFieldType(type: SchemaFieldType | string): boolean {
  return type === SchemaFieldTypes.STRING_ENUM || type === SchemaFieldTypes.NUMBER_ENUM;
}

export const OUTPUT_DATA_CONFIG_EXAMPLE = {
  output_formats: [OutputFormats.STRUCTURED_JSON, OutputFormats.MARKDOWN],
  output_schema: {
    title: "string",
    price: "number",
    location: "string",
    property_url: "string",
    status: ["for_sale", "sold", "pending"],
    rating: [1, 2, 3, 4, 5],
    agent: {
      name: "string",
      email: "string",
    },
    contacts: [
      {
        name: "string",
        email: "string",
        role: "string",
      },
    ],
    features: "string[]",
  },
} as const;
