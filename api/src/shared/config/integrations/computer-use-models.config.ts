import { ComputerUseModel } from 'generated/prisma';

export interface ComputerUseModelDefinition {
  value: ComputerUseModel;
  label: string;
  api_model: string;
  supports_computer_use: boolean;
}

export const COMPUTER_USE_MODELS: ComputerUseModelDefinition[] = [
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

export const COMPUTER_USE_MODEL_API_IDS = Object.fromEntries(
  COMPUTER_USE_MODELS.map((model) => [model.value, model.api_model]),
) as Record<ComputerUseModel, string>;

export function getComputerUseModelApiId(model: ComputerUseModel): string {
  return COMPUTER_USE_MODEL_API_IDS[model];
}

export function isComputerUseModel(value: string): value is ComputerUseModel {
  return value in COMPUTER_USE_MODEL_API_IDS;
}
