import { z } from "zod";

export const createWebhookEndpointSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  secret: z.string().min(16, "Secret must be at least 16 characters").max(200),
  subscribed_events: z.array(z.string()).min(1, "Select at least one event"),
});

export type CreateWebhookEndpointFormValues = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  secret: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || value.length >= 16, {
      message: "Secret must be at least 16 characters",
    }),
  subscribed_events: z.array(z.string()).min(1, "Select at least one event"),
});

export type UpdateWebhookEndpointFormValues = z.infer<typeof updateWebhookEndpointSchema>;
