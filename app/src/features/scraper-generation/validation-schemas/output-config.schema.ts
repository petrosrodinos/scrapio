import { z } from "zod";
import {
  OutputFormats,
  SchemaFieldTypes,
  isComplexSchemaFieldType,
  isEnumSchemaFieldType,
  type OutputFormat,
  type OutputSchemaDefinition,
  type OutputSchemaEnumValue,
  type OutputSchemaField,
  type SchemaFieldType,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";

export function createEmptyOutputSchemaField(): OutputSchemaField {
  return {
    name: "",
    type: SchemaFieldTypes.STRING,
  };
}

export function createEmptyEnumValue(type: SchemaFieldType): OutputSchemaEnumValue {
  return type === SchemaFieldTypes.NUMBER_ENUM ? 0 : "";
}

export const EmptyOutputSchemaField = createEmptyOutputSchemaField();

function fieldValueToDefinition(field: OutputSchemaField): unknown {
  if (isEnumSchemaFieldType(field.type)) {
    return field.enumValues ?? [];
  }

  if (!isComplexSchemaFieldType(field.type)) {
    return field.type;
  }

  const nested = schemaFieldsToDefinition(field.children ?? []);
  if (field.type === SchemaFieldTypes.OBJECT_ARRAY) {
    return [nested];
  }
  return nested;
}

export function schemaFieldsToDefinition(fields: OutputSchemaField[]): OutputSchemaDefinition {
  return Object.fromEntries(
    fields
      .filter((field) => field.name.trim())
      .map((field) => [field.name.trim(), fieldValueToDefinition(field)]),
  );
}

function isStringEnumArray(value: unknown[]): value is string[] {
  return value.length > 0 && value.every((item) => typeof item === "string");
}

function isNumberEnumArray(value: unknown[]): value is number[] {
  return (
    value.length > 0 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function inferSchemaFieldType(value: unknown): SchemaFieldType {
  if (typeof value === "string") {
    return value as SchemaFieldType;
  }
  if (Array.isArray(value)) {
    if (isStringEnumArray(value)) {
      return SchemaFieldTypes.STRING_ENUM;
    }
    if (isNumberEnumArray(value)) {
      return SchemaFieldTypes.NUMBER_ENUM;
    }
    return SchemaFieldTypes.OBJECT_ARRAY;
  }
  if (value && typeof value === "object") {
    return SchemaFieldTypes.OBJECT;
  }
  return SchemaFieldTypes.STRING;
}

function definitionValueToField(name: string, value: unknown): OutputSchemaField {
  const type = inferSchemaFieldType(value);

  if (type === SchemaFieldTypes.STRING_ENUM && Array.isArray(value)) {
    return { name, type, enumValues: [...value] as string[] };
  }

  if (type === SchemaFieldTypes.NUMBER_ENUM && Array.isArray(value)) {
    return { name, type, enumValues: [...value] as number[] };
  }

  if (type === SchemaFieldTypes.OBJECT && value && typeof value === "object" && !Array.isArray(value)) {
    return {
      name,
      type,
      children: definitionToSchemaFields(value as OutputSchemaDefinition),
    };
  }

  if (type === SchemaFieldTypes.OBJECT_ARRAY && Array.isArray(value)) {
    const item = value[0];
    const children =
      item && typeof item === "object" && !Array.isArray(item)
        ? definitionToSchemaFields(item as OutputSchemaDefinition)
        : [createEmptyOutputSchemaField()];
    return { name, type, children };
  }

  return { name, type };
}

export function definitionToSchemaFields(definition: OutputSchemaDefinition): OutputSchemaField[] {
  return Object.entries(definition).map(([name, value]) => definitionValueToField(name, value));
}

export function parseOutputSchemaJson(value: string): OutputSchemaDefinition | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = JSON.parse(trimmed) as unknown;
  const result = outputSchemaDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(formatOutputSchemaZodError(result.error));
  }

  return result.data;
}

const PRIMITIVE_SCHEMA_TYPES = [
  SchemaFieldTypes.STRING,
  SchemaFieldTypes.NUMBER,
  SchemaFieldTypes.INTEGER,
  SchemaFieldTypes.BOOLEAN,
  SchemaFieldTypes.STRING_ARRAY,
  SchemaFieldTypes.NUMBER_ARRAY,
  SchemaFieldTypes.BOOLEAN_ARRAY,
] as const;

type PrimitiveSchemaType = (typeof PRIMITIVE_SCHEMA_TYPES)[number];

const PRIMITIVE_SCHEMA_TYPE_SET = new Set<string>(PRIMITIVE_SCHEMA_TYPES);

const SUPPORTED_SCHEMA_TYPE_HINT = `${PRIMITIVE_SCHEMA_TYPES.join(", ")}, a string enum (["a", "b"]), a number enum ([1, 2]), a nested object ({ ... }), or an object array ([{ ... }])`;

function isPrimitiveSchemaType(value: string): value is PrimitiveSchemaType {
  return PRIMITIVE_SCHEMA_TYPE_SET.has(value);
}

function formatSchemaPath(path: PropertyKey[]): string {
  return path.map(String).join(".");
}

function validateEnumArray(
  value: unknown[],
  path: PropertyKey[],
): string | null {
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : "root";

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

  if (value.length === 1 && value[0] && typeof value[0] === "object" && !Array.isArray(value[0])) {
    return validateOutputSchemaDefinitionObject(value[0] as Record<string, unknown>, path);
  }

  return `Invalid schema at ${label}: arrays must be a string enum (["a", "b"]), a number enum ([1, 2]), or an object array ([{ ... }])`;
}

function validateOutputSchemaDefinitionValue(
  value: unknown,
  path: PropertyKey[],
): string | null {
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : "root";

  if (typeof value === "string") {
    if (!isPrimitiveSchemaType(value)) {
      return `Invalid schema at ${label}: "${value}" is not a supported schema type. Use ${SUPPORTED_SCHEMA_TYPE_HINT}`;
    }
    return null;
  }

  if (Array.isArray(value)) {
    return validateEnumArray(value, path);
  }

  if (value && typeof value === "object") {
    return validateOutputSchemaDefinitionObject(value as Record<string, unknown>, path);
  }

  return `Invalid schema at ${label}: expected ${SUPPORTED_SCHEMA_TYPE_HINT}`;
}

function validateOutputSchemaDefinitionObject(
  value: Record<string, unknown>,
  path: PropertyKey[],
): string | null {
  const entries = Object.entries(value);
  const label = path.length > 0 ? `"${formatSchemaPath(path)}"` : "root";

  if (entries.length === 0) {
    return path.length === 0
      ? "Output schema must contain at least one field"
      : `Invalid schema at ${label}: nested object must contain at least one field`;
  }

  for (const [key, nestedValue] of entries) {
    if (!key.trim()) {
      return `Invalid schema at ${label}: field names cannot be empty`;
    }

    const nestedError = validateOutputSchemaDefinitionValue(nestedValue, [...path, key]);
    if (nestedError) {
      return nestedError;
    }
  }

  return null;
}

export const outputSchemaDefinitionSchema: z.ZodType<OutputSchemaDefinition> = z.custom<OutputSchemaDefinition>(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    return validateOutputSchemaDefinitionObject(value as Record<string, unknown>, []) === null;
  },
  {
    error: (issue) => {
      const value = issue.input;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return "Output schema must be a JSON object, not an array or primitive";
      }
      return (
        validateOutputSchemaDefinitionObject(value as Record<string, unknown>, []) ??
        "Invalid output schema"
      );
    },
  },
);

function formatOutputSchemaZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid output schema";
}

export function getOutputSchemaJsonError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Output schema JSON is required";
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const positionMatch = /position\s+(\d+)/i.exec(error.message);
      if (positionMatch) {
        const position = Number(positionMatch[1]);
        const before = trimmed.slice(0, position);
        const line = before.split("\n").length;
        const column = before.length - before.lastIndexOf("\n");
        return `Invalid JSON at line ${line}, column ${column}`;
      }
      return `Invalid JSON: ${error.message}`;
    }
    return "Invalid JSON";
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "Output schema must be a JSON object, not an array or primitive";
  }

  return validateOutputSchemaDefinitionObject(parsed as Record<string, unknown>, []);
}

export function isOutputSchemaJsonValid(value: string): boolean {
  return getOutputSchemaJsonError(value) === null;
}

export function serializeOutputSchemaJson(definition: OutputSchemaDefinition): string {
  return JSON.stringify(definition, null, 2);
}

function validateEnumFieldValues(
  field: OutputSchemaField,
  path: (string | number)[],
  ctx: z.RefinementCtx,
): void {
  const values = field.enumValues ?? [];
  if (values.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one enum value",
      path: [...path, "enumValues"],
    });
    return;
  }

  if (field.type === SchemaFieldTypes.STRING_ENUM) {
    if (values.some((value) => typeof value !== "string" || !value.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "String enum values cannot be empty",
        path: [...path, "enumValues"],
      });
    }
  }

  if (field.type === SchemaFieldTypes.NUMBER_ENUM) {
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Number enum values must be valid numbers",
        path: [...path, "enumValues"],
      });
    }
  }

  if (new Set(values.map(String)).size !== values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enum values must be unique",
      path: [...path, "enumValues"],
    });
  }
}

function validateSchemaFields(
  fields: OutputSchemaField[],
  path: (string | number)[],
  ctx: z.RefinementCtx,
): void {
  const namedFields = fields.filter((field) => field.name.trim());
  if (namedFields.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one field",
      path,
    });
    return;
  }

  const names = namedFields.map((field) => field.name.trim());
  if (new Set(names).size !== names.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Field names must be unique",
      path,
    });
  }

  fields.forEach((field, index) => {
    if (!field.name.trim()) {
      return;
    }

    if (isEnumSchemaFieldType(field.type)) {
      validateEnumFieldValues(field, [...path, index], ctx);
      return;
    }

    if (isComplexSchemaFieldType(field.type)) {
      validateSchemaFields(field.children ?? [], [...path, index, "children"], ctx);
    }
  });
}

const outputFormatSchema = z.enum([
  OutputFormats.STRUCTURED_JSON,
  OutputFormats.MARKDOWN,
]);

export const outputSchemaFieldSchema: z.ZodType<OutputSchemaField> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string().min(1),
    children: z.array(outputSchemaFieldSchema).optional(),
    enumValues: z.array(z.union([z.string(), z.number()])).optional(),
  }),
) as z.ZodType<OutputSchemaField>;

export const outputDataConfigSchema = z
  .object({
    output_formats: z
      .array(outputFormatSchema)
      .min(1, "Select at least one output format"),
    output_schema_mode: z.enum(["builder", "json"]),
    output_schema_fields: z.array(outputSchemaFieldSchema),
    output_schema_json: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.output_formats.includes(OutputFormats.STRUCTURED_JSON)) {
      return;
    }

    if (values.output_schema_mode === "builder") {
      validateSchemaFields(values.output_schema_fields, ["output_schema_fields"], ctx);
      return;
    }

    if (!values.output_schema_json.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Output schema JSON is required for structured JSON",
        path: ["output_schema_json"],
      });
      return;
    }

    const jsonError = getOutputSchemaJsonError(values.output_schema_json);
    if (jsonError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: jsonError,
        path: ["output_schema_json"],
      });
    }
  });

export type OutputDataConfigFormValues = z.infer<typeof outputDataConfigSchema>;

export function resolveOutputSchemaFromForm(
  values: Pick<
    OutputDataConfigFormValues,
    "output_formats" | "output_schema_mode" | "output_schema_fields" | "output_schema_json"
  >,
): OutputSchemaDefinition | undefined {
  if (!values.output_formats.includes(OutputFormats.STRUCTURED_JSON)) {
    return undefined;
  }

  if (values.output_schema_mode === "builder") {
    const definition = schemaFieldsToDefinition(values.output_schema_fields);
    return Object.keys(definition).length > 0 ? definition : undefined;
  }

  return parseOutputSchemaJson(values.output_schema_json);
}

export function defaultOutputDataConfigValues(): OutputDataConfigFormValues {
  return {
    output_formats: [OutputFormats.STRUCTURED_JSON],
    output_schema_mode: "builder",
    output_schema_fields: [createEmptyOutputSchemaField()],
    output_schema_json: "",
  };
}

export function isOutputFormat(value: string): value is OutputFormat {
  return value === OutputFormats.STRUCTURED_JSON || value === OutputFormats.MARKDOWN;
}

export function withSchemaFieldType(
  field: OutputSchemaField,
  type: SchemaFieldType,
): OutputSchemaField {
  if (isEnumSchemaFieldType(type)) {
    return {
      name: field.name,
      type,
      enumValues:
        field.enumValues && field.enumValues.length > 0
          ? field.enumValues.map((value) =>
              type === SchemaFieldTypes.NUMBER_ENUM
                ? typeof value === "number"
                  ? value
                  : Number(value) || 0
                : String(value),
            )
          : [createEmptyEnumValue(type)],
    };
  }

  if (!isComplexSchemaFieldType(type)) {
    return { name: field.name, type };
  }

  return {
    name: field.name,
    type,
    children:
      field.children && field.children.length > 0
        ? field.children
        : [createEmptyOutputSchemaField()],
  };
}
