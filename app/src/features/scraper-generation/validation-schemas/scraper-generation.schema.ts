import { z } from "zod";
import {
  createOutputDataConfigSchema,
  defaultOutputDataConfigValues,
  outputDataConfigSchema,
  resolveOutputSchemaFromForm,
} from "@/features/scraper-generation/validation-schemas/output-config.schema";

const optionalMaxSteps = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().min(1).optional());

const outputConfigDefaults = defaultOutputDataConfigValues();

const createGenerationRunBaseSchema = z.object({
  website_target_id: z.string().min(1, "Website target is required"),
  scraper_id: z.string().optional(),
  prompt: z.string().trim().min(1, "Prompt is required"),
  max_steps: optionalMaxSteps,
});

export const createGenerationRunFormSchema = createGenerationRunBaseSchema.merge(outputDataConfigSchema);

export const createScraperGenerationRunFormSchema = createGenerationRunBaseSchema.merge(
  createOutputDataConfigSchema(false),
);

export type CreateGenerationRunFormValues = z.infer<typeof createGenerationRunFormSchema>;

export function buildCreateGenerationRunPayload(
  values: CreateGenerationRunFormValues,
  options: { start: boolean },
) {
  return {
    website_target_id: values.website_target_id,
    scraper_id: values.scraper_id || undefined,
    prompt: values.prompt.trim(),
    max_steps: values.max_steps,
    output_formats: values.output_formats,
    output_schema: resolveOutputSchemaFromForm(values),
    start: options.start,
  };
}

const optionalNullableMaxSteps = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().min(1).nullable());

export const updateGenerationRunFormSchema = z
  .object({
    prompt: z.string().trim().min(1, "Prompt is required"),
    max_steps: optionalNullableMaxSteps,
  })
  .merge(outputDataConfigSchema);

export type UpdateGenerationRunFormValues = z.infer<typeof updateGenerationRunFormSchema>;

export function buildUpdateGenerationRunPayload(values: UpdateGenerationRunFormValues) {
  return {
    prompt: values.prompt.trim(),
    max_steps: values.max_steps,
    output_formats: values.output_formats,
    output_schema: resolveOutputSchemaFromForm(values) ?? null,
  };
}

export { outputConfigDefaults };
