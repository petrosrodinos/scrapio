import { ComputerUseModel } from 'generated/prisma';

export interface IntegrationModelDefinition {
  value: ComputerUseModel;
  label: string;
  api_model: string;
  supports_computer_use: boolean;
}

export const ANTHROPIC_COMPUTER_USE_MODELS: IntegrationModelDefinition[] = [
  {
    value: ComputerUseModel.CLAUDE_OPUS_4_8,
    label: 'Claude Opus 4.8',
    api_model: 'claude-opus-4-8',
    supports_computer_use: true,
  },
  {
    value: ComputerUseModel.CLAUDE_SONNET_4_6,
    label: 'Claude Sonnet 4.6',
    api_model: 'claude-sonnet-4-6',
    supports_computer_use: true,
  },
];

export const OPENAI_AI_MODELS: IntegrationModelDefinition[] = [
  {
    value: ComputerUseModel.GPT_4O,
    label: 'GPT-4o',
    api_model: 'gpt-4o',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GPT_4O_MINI,
    label: 'GPT-4o Mini',
    api_model: 'gpt-4o-mini',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GPT_4_TURBO,
    label: 'GPT-4 Turbo',
    api_model: 'gpt-4-turbo',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GPT_4,
    label: 'GPT-4',
    api_model: 'gpt-4',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GPT_35_TURBO,
    label: 'GPT-3.5 Turbo',
    api_model: 'gpt-3.5-turbo',
    supports_computer_use: false,
  },
];

export const GEMINI_AI_MODELS: IntegrationModelDefinition[] = [
  {
    value: ComputerUseModel.GEMINI_2_5_PRO,
    label: 'Gemini 2.5 Pro',
    api_model: 'gemini-2.5-pro',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GEMINI_2_5_FLASH,
    label: 'Gemini 2.5 Flash',
    api_model: 'gemini-2.5-flash',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GEMINI_2_0_FLASH,
    label: 'Gemini 2.0 Flash',
    api_model: 'gemini-2.0-flash',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GEMINI_1_5_PRO,
    label: 'Gemini 1.5 Pro',
    api_model: 'gemini-1.5-pro',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.GEMINI_1_5_FLASH,
    label: 'Gemini 1.5 Flash',
    api_model: 'gemini-1.5-flash',
    supports_computer_use: false,
  },
];

export const DEEPSEEK_AI_MODELS: IntegrationModelDefinition[] = [
  {
    value: ComputerUseModel.DEEPSEEK_CHAT,
    label: 'DeepSeek Chat',
    api_model: 'deepseek-chat',
    supports_computer_use: false,
  },
  {
    value: ComputerUseModel.DEEPSEEK_REASONER,
    label: 'DeepSeek Reasoner',
    api_model: 'deepseek-reasoner',
    supports_computer_use: false,
  },
];

export const ALL_INTEGRATION_MODELS: IntegrationModelDefinition[] = [
  ...ANTHROPIC_COMPUTER_USE_MODELS,
  ...OPENAI_AI_MODELS,
  ...GEMINI_AI_MODELS,
  ...DEEPSEEK_AI_MODELS,
];

export const INTEGRATION_MODEL_API_IDS = Object.fromEntries(
  ALL_INTEGRATION_MODELS.map((model) => [model.value, model.api_model]),
) as Record<ComputerUseModel, string>;

export function getIntegrationModelApiId(model: ComputerUseModel): string {
  return INTEGRATION_MODEL_API_IDS[model];
}

export function isKnownIntegrationModel(
  value: string,
): value is ComputerUseModel {
  return value in INTEGRATION_MODEL_API_IDS;
}
