import { z } from 'zod';
import { WebhookDeliveryStatus, WebhookEventType } from 'generated/prisma';

export const WebhookDeliveryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 20)),
  status: z.nativeEnum(WebhookDeliveryStatus).optional(),
  event_type: z.nativeEnum(WebhookEventType).optional(),
});

export type WebhookDeliveryQueryType = z.infer<typeof WebhookDeliveryQuerySchema>;
