import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expires_at: z.string().optional().or(z.literal("")),
});

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

export const renameApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type RenameApiKeyFormValues = z.infer<typeof renameApiKeySchema>;
