import { z } from "zod";

const optionalJsonTextarea = z.string().refine(
  (value) => {
    if (!value.trim()) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Enter valid JSON" },
);

export function parseOptionalJsonConfig(value: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed) as Record<string, unknown>;
}

export const createScraperFormSchema = z.object({
  website_target_id: z.string().min(1, "Website target is required"),
  name: z.string().min(1, "Name is required"),
  schedule_cron: z
    .string()
    .nullable()
    .refine(
      (value) => value == null || /^(\S+\s+){4}\S+$/.test(value),
      "Enter a valid 5-field cron expression",
    ),
  config: optionalJsonTextarea,
});

export type CreateScraperFormValues = z.infer<typeof createScraperFormSchema>;

export const createScraperVersionFormSchema = z.object({
  config: optionalJsonTextarea,
  notes: z.string().optional(),
});

export type CreateScraperVersionFormValues = z.infer<typeof createScraperVersionFormSchema>;
