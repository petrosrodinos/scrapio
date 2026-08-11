import { z } from "zod";
import {
  outputDataConfigSchema,
  defaultOutputDataConfigValues,
  definitionToSchemaFields,
  resolveOutputSchemaFromForm,
  serializeOutputSchemaJson,
} from "@/features/scraper-generation/validation-schemas/output-config.schema";
import { OutputSchemaEditorModes } from "@/features/scraper-generation/interfaces/output-config.interfaces";
import type { BrowserAgentConfig } from "../interfaces/browser-agent.interfaces";

export const browserAgentFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    url: z.string().url("Enter a valid URL"),
    schedule_cron: z.string().nullable(),
  })
  .and(outputDataConfigSchema);

export type BrowserAgentFormValues = z.infer<typeof browserAgentFormSchema>;

export function defaultBrowserAgentFormValues(): BrowserAgentFormValues {
  return {
    name: "",
    description: "",
    url: "",
    schedule_cron: null,
    ...defaultOutputDataConfigValues(),
  };
}

export function browserAgentConfigToFormValues(config: BrowserAgentConfig): BrowserAgentFormValues {
  const definition = config.extraction_schema_version?.definition ?? null;
  const schemaFields = definition ? definitionToSchemaFields(definition) : [];

  return {
    name: config.name,
    description: config.description ?? "",
    url: config.url,
    schedule_cron: config.schedule_cron,
    output_formats: config.output_formats,
    output_schema_mode: OutputSchemaEditorModes.BUILDER,
    output_schema_fields: schemaFields,
    output_schema_json: definition ? serializeOutputSchemaJson(definition) : "",
  };
}

export function browserAgentFormValuesToPayload(values: BrowserAgentFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    url: values.url,
    output_formats: values.output_formats,
    output_schema: resolveOutputSchemaFromForm(values),
    schedule_cron: values.schedule_cron,
  };
}
