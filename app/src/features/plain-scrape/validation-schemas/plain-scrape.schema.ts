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
    urls: z.array(z.string()),
    extraction_scope: z.enum([ExtractionScopes.COMBINED, ExtractionScopes.PER_URL]),
    schedule_cron: z.string().nullable(),
  })
  .and(plainScrapeOutputConfigSchema)
  .superRefine((values, ctx) => {
    const urls = sanitizeUrls(values.urls);

    if (urls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one URL",
        path: ["urls"],
      });
      return;
    }

    if (urls.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A maximum of 200 URLs is allowed",
        path: ["urls"],
      });
      return;
    }

    for (const url of urls) {
      const result = urlLineSchema.safeParse(url);
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid URL: ${url}`,
          path: ["urls"],
        });
        return;
      }
    }
  });

export type PlainScrapeFormValues = z.infer<typeof plainScrapeFormSchema>;

export function sanitizeUrls(urls: string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean);
}

export function defaultPlainScrapeFormValues(): PlainScrapeFormValues {
  return {
    name: "",
    description: "",
    urls: [""],
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
    urls: config.urls.length > 0 ? config.urls : [""],
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
    urls: sanitizeUrls(values.urls),
    extraction_scope: values.extraction_scope,
    output_formats: values.output_formats,
    output_schema: resolveOutputSchemaFromForm(values),
    schedule_cron: values.schedule_cron,
  };
}
