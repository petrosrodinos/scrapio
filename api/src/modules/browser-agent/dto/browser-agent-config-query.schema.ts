import { z } from 'zod';

export const BrowserAgentConfigQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 20)),
  search: z.string().optional(),
  user_id: z.string().uuid().optional(),
});

export type BrowserAgentConfigQueryType = z.infer<
  typeof BrowserAgentConfigQuerySchema
>;
