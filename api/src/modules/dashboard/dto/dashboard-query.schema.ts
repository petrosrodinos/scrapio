import { z } from 'zod';

export const DashboardQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
});

export type DashboardQueryType = z.infer<typeof DashboardQuerySchema>;
