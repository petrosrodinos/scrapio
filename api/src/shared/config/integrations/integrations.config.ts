import { IntegrationType } from 'generated/prisma';

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
  },
];

export const INTEGRATIONS_BY_TYPE = Object.fromEntries(
  INTEGRATIONS.map((integration) => [integration.type, integration]),
) as Record<IntegrationType, IntegrationDefinition>;
