import { z } from "zod";
import {
  OutputFormats,
  SchemaFieldTypes,
  isComplexSchemaFieldType,
  type OutputFormat,
  type OutputSchemaDefinition,
  type OutputSchemaField,
  type SchemaFieldType,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";

export function createEmptyOutputSchemaField(): OutputSchemaField {
  return {
    name: "",
    type: SchemaFieldTypes.STRING,
  };
}

export const EmptyOutputSchemaField = createEmptyOutputSchemaField();

function fieldValueToDefinition(field: OutputSchemaField): unknown {
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

function inferSchemaFieldType(value: unknown): SchemaFieldType {
  if (typeof value === "string") {
    return value as SchemaFieldType;
  }
  if (Array.isArray(value)) {
    return SchemaFieldTypes.OBJECT_ARRAY;
  }
  if (value && typeof value === "object") {
    return SchemaFieldTypes.OBJECT;
  }
  return SchemaFieldTypes.STRING;
}

function definitionValueToField(name: string, value: unknown): OutputSchemaField {
  const type = inferSchemaFieldType(value);

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
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Output schema must be a JSON object");
  }

  return parsed as OutputSchemaDefinition;
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

  if (Object.keys(parsed as Record<string, unknown>).length === 0) {
    return "Output schema must contain at least one field";
  }

  return null;
}

export function isOutputSchemaJsonValid(value: string): boolean {
  return getOutputSchemaJsonError(value) === null;
}

export function serializeOutputSchemaJson(definition: OutputSchemaDefinition): string {
  return JSON.stringify(definition, null, 2);
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
    if (!field.name.trim() || !isComplexSchemaFieldType(field.type)) {
      return;
    }
    validateSchemaFields(field.children ?? [], [...path, index, "children"], ctx);
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
