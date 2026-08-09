import { ComputerUseModel, IntegrationType } from 'generated/prisma';
import {
  ANTHROPIC_COMPUTER_USE_MODELS,
  DEEPSEEK_AI_MODELS,
  GEMINI_AI_MODELS,
  IntegrationModelDefinition,
  OPENAI_AI_MODELS,
} from './integration-models.config';

export interface IntegrationFieldDefinition {
  key: string;
  label: string;
  type: 'password' | 'text';
  required: boolean;
}

export interface IntegrationDefinition {
  type: IntegrationType;
  name: string;
  base_url: string;
  is_visible: boolean;
  config_schema: {
    fields: IntegrationFieldDefinition[];
  };
  computer_use_models: IntegrationModelDefinition[];
  ai_models: IntegrationModelDefinition[];
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    type: IntegrationType.ANTHROPIC,
    name: 'Anthropic',
    base_url: 'https://api.anthropic.com',
    is_visible: true,
    config_schema: {
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
      ],
    },
    computer_use_models: ANTHROPIC_COMPUTER_USE_MODELS,
    ai_models: [],
  },
  {
    type: IntegrationType.OPENAI,
    name: 'OpenAI',
    base_url: 'https://api.openai.com',
    is_visible: true,
    config_schema: {
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
      ],
    },
    computer_use_models: [],
    ai_models: OPENAI_AI_MODELS,
  },
  {
    type: IntegrationType.GEMINI,
    name: 'Google Gemini',
    base_url: 'https://generativelanguage.googleapis.com',
    is_visible: true,
    config_schema: {
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
      ],
    },
    computer_use_models: [],
    ai_models: GEMINI_AI_MODELS,
  },
  {
    type: IntegrationType.DEEPSEEK,
    name: 'DeepSeek',
    base_url: 'https://api.deepseek.com',
    is_visible: true,
    config_schema: {
      fields: [
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
      ],
    },
    computer_use_models: [],
    ai_models: DEEPSEEK_AI_MODELS,
  },
];

export const INTEGRATIONS_BY_TYPE = Object.fromEntries(
  INTEGRATIONS.map((integration) => [integration.type, integration]),
) as Record<IntegrationType, IntegrationDefinition>;

export function integrationRequiresComputerUseModel(
  integrationType: IntegrationType,
): boolean {
  return (
    (INTEGRATIONS_BY_TYPE[integrationType]?.computer_use_models.length ?? 0) > 0
  );
}

export function integrationRequiresAiModel(
  integrationType: IntegrationType,
): boolean {
  return (INTEGRATIONS_BY_TYPE[integrationType]?.ai_models.length ?? 0) > 0;
}

export function isComputerUseModelAllowed(
  integrationType: IntegrationType,
  model: ComputerUseModel,
): boolean {
  return (
    INTEGRATIONS_BY_TYPE[integrationType]?.computer_use_models.some(
      (entry) => entry.value === model,
    ) ?? false
  );
}

export function isAiModelAllowed(
  integrationType: IntegrationType,
  model: ComputerUseModel,
): boolean {
  return (
    INTEGRATIONS_BY_TYPE[integrationType]?.ai_models.some(
      (entry) => entry.value === model,
    ) ?? false
  );
}
