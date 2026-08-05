import { z } from "zod";
import {
  ComputerUseModels,
  IntegrationTypes,
} from "@/features/integrations/interfaces/integrations.interfaces";

export const connectUserIntegrationSchema = z
  .object({
    integration_type: z.enum([
      IntegrationTypes.OPENAI,
      IntegrationTypes.ANTHROPIC,
      IntegrationTypes.GEMINI,
      IntegrationTypes.DEEPSEEK,
    ]),
    api_key: z.string().min(1, "API key is required"),
    computer_use_model: z
      .enum([ComputerUseModels.CLAUDE_OPUS_4_8, ComputerUseModels.CLAUDE_SONNET_4_6])
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.integration_type === IntegrationTypes.ANTHROPIC &&
      !values.computer_use_model
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Model is required",
        path: ["computer_use_model"],
      });
    }
  });

export type ConnectUserIntegrationFormValues = z.infer<
  typeof connectUserIntegrationSchema
>;

export const updateUserIntegrationSchema = z.object({
  api_key: z.string().min(1, "API key is required").optional().or(z.literal("")),
  computer_use_model: z
    .enum([ComputerUseModels.CLAUDE_OPUS_4_8, ComputerUseModels.CLAUDE_SONNET_4_6])
    .optional(),
  is_active: z.boolean().optional(),
});

export type UpdateUserIntegrationFormValues = z.infer<
  typeof updateUserIntegrationSchema
>;
