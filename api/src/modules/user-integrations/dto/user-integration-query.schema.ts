import { z } from 'zod';
import { IntegrationType } from 'generated/prisma';

export const UserIntegrationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10)),
  integration_type: z.nativeEnum(IntegrationType).optional(),
  is_active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  user_id: z.string().uuid().optional(),
});

export type UserIntegrationQueryType = z.infer<
  typeof UserIntegrationQuerySchema
>;
