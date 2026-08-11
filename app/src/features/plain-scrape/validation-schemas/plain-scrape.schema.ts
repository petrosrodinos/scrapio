import { z } from "zod";
import {
  createOutputDataConfigSchema,
  defaultOutputDataConfigValues,
  definitionToSchemaFields,
  resolveOutputSchemaFromForm,
  serializeOutputSchemaJson,
} from "@/features/scraper-generation/validation-schemas/output-config.schema";
import { OutputSchemaEditorModes } from "@/features/scraper-generation/interfaces/output-config.interfaces";
import { ExtractionScopes } from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";
import type { PlainScrapeConfig } from "../interfaces/plain-scrape.interfaces";

const urlLineSchema = z.string().url("Enter a valid URL");

const plainScrapeOutputConfigSchema = createOutputDataConfigSchema(false);

export const plainScrapeFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    urls_text: z.string().min(1, "Add at least one URL"),
    extraction_scope: z.enum([ExtractionScopes.COMBINED, ExtractionScopes.PER_URL]),
    schedule_cron: z.string().nullable(),
  })
  .and(plainScrapeOutputConfigSchema)
  .superRefine((values, ctx) => {
    const lines = values.urls_text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one URL",
        path: ["urls_text"],
      });
      return;
    }

    if (lines.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A maximum of 200 URLs is allowed",
        path: ["urls_text"],
      });
      return;
    }

    for (const line of lines) {
      const result = urlLineSchema.safeParse(line);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid URL: ${line}`,
          path: ["urls_text"],
        });
        return;
      }
    }
  });

export type PlainScrapeFormValues = z.infer<typeof plainScrapeFormSchema>;

export function parseUrlsText(urlsText: string): string[] {
  return urlsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function defaultPlainScrapeFormValues(): PlainScrapeFormValues {
  return {
    name: "",
    description: "",
    urls_text: "",
    extraction_scope: ExtractionScopes.COMBINED,
    schedule_cron: null,
    ...defaultOutputDataConfigValues(),
    output_formats: [],
  };
}

export function plainScrapeConfigToFormValues(config: PlainScrapeConfig): PlainScrapeFormValues {
  const definition = config.extraction_schema_version?.definition ?? null;
  const schemaFields = definition ? definitionToSchemaFields(definition) : [];

  return {
    name: config.name,
    description: config.description ?? "",
    urls_text: config.urls.join("\n"),
    extraction_scope: config.extraction_scope,
    schedule_cron: config.schedule_cron,
    output_formats: config.output_formats,
    output_schema_mode: OutputSchemaEditorModes.BUILDER,
    output_schema_fields: schemaFields,
    output_schema_json: definition ? serializeOutputSchemaJson(definition) : "",
  };
}

export function plainScrapeFormValuesToPayload(values: PlainScrapeFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    urls: parseUrlsText(values.urls_text),
    extraction_scope: values.extraction_scope,
    output_formats: values.output_formats,
    output_schema: resolveOutputSchemaFromForm(values),
    schedule_cron: values.schedule_cron,
  };
}
