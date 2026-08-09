import { z } from "zod";
import {
  ComputerUseModels,
  IntegrationTypes,
} from "@/features/integrations/interfaces/integrations.interfaces";

const integrationModelEnum = z.enum([
  ComputerUseModels.CLAUDE_OPUS_4_8,
  ComputerUseModels.CLAUDE_SONNET_4_6,
  ComputerUseModels.GPT_4O,
  ComputerUseModels.GPT_4O_MINI,
  ComputerUseModels.GPT_4_TURBO,
  ComputerUseModels.GPT_4,
  ComputerUseModels.GPT_35_TURBO,
  ComputerUseModels.GEMINI_2_5_PRO,
  ComputerUseModels.GEMINI_2_5_FLASH,
  ComputerUseModels.GEMINI_2_0_FLASH,
  ComputerUseModels.GEMINI_1_5_PRO,
  ComputerUseModels.GEMINI_1_5_FLASH,
  ComputerUseModels.DEEPSEEK_CHAT,
  ComputerUseModels.DEEPSEEK_REASONER,
]);

const computerUseRequiredTypes = new Set([IntegrationTypes.ANTHROPIC]);

const aiModelRequiredTypes = new Set([
  IntegrationTypes.OPENAI,
  IntegrationTypes.GEMINI,
  IntegrationTypes.DEEPSEEK,
]);

export const connectUserIntegrationSchema = z
  .object({
    integration_type: z.enum([
      IntegrationTypes.OPENAI,
      IntegrationTypes.ANTHROPIC,
      IntegrationTypes.GEMINI,
      IntegrationTypes.DEEPSEEK,
    ]),
    api_key: z.string().min(1, "API key is required"),
    computer_use_model: integrationModelEnum.optional(),
    ai_model: integrationModelEnum.optional(),
    is_default: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      computerUseRequiredTypes.has(values.integration_type) &&
      !values.computer_use_model
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Computer use model is required",
        path: ["computer_use_model"],
      });
    }

    if (aiModelRequiredTypes.has(values.integration_type) && !values.ai_model) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AI model is required",
        path: ["ai_model"],
      });
    }
  });

export type ConnectUserIntegrationFormValues = z.infer<
  typeof connectUserIntegrationSchema
>;

export const updateUserIntegrationSchema = z.object({
  api_key: z.string().optional().or(z.literal("")),
  computer_use_model: integrationModelEnum.optional(),
  ai_model: integrationModelEnum.optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export type UpdateUserIntegrationFormValues = z.infer<
  typeof updateUserIntegrationSchema
>;
