export const IntegrationTypes = {
  OPENAI: "OPENAI",
  ANTHROPIC: "ANTHROPIC",
  GEMINI: "GEMINI",
  DEEPSEEK: "DEEPSEEK",
} as const;

export type IntegrationType =
  (typeof IntegrationTypes)[keyof typeof IntegrationTypes];

export const ComputerUseModels = {
  CLAUDE_OPUS_4_8: "CLAUDE_OPUS_4_8",
  CLAUDE_SONNET_4_6: "CLAUDE_SONNET_4_6",
  GPT_4O: "GPT_4O",
  GPT_4O_MINI: "GPT_4O_MINI",
  GPT_4_TURBO: "GPT_4_TURBO",
  GPT_4: "GPT_4",
  GPT_35_TURBO: "GPT_35_TURBO",
  GEMINI_2_5_PRO: "GEMINI_2_5_PRO",
  GEMINI_2_5_FLASH: "GEMINI_2_5_FLASH",
  GEMINI_2_0_FLASH: "GEMINI_2_0_FLASH",
  GEMINI_1_5_PRO: "GEMINI_1_5_PRO",
  GEMINI_1_5_FLASH: "GEMINI_1_5_FLASH",
  DEEPSEEK_CHAT: "DEEPSEEK_CHAT",
  DEEPSEEK_REASONER: "DEEPSEEK_REASONER",
} as const;

export type ComputerUseModel =
  (typeof ComputerUseModels)[keyof typeof ComputerUseModels];

export interface IntegrationModel {
  value: ComputerUseModel;
  label: string;
  api_model: string;
  supports_computer_use: boolean;
}

export interface Integration {
  type: IntegrationType;
  name: string;
  base_url: string;
  is_visible: boolean;
  config_schema: {
    fields: Array<{
      key: string;
      label: string;
      type: "password" | "text";
      required: boolean;
    }>;
  };
  computer_use_models: IntegrationModel[];
  ai_models: IntegrationModel[];
}
