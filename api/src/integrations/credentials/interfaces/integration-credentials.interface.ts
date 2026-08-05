import { IntegrationType } from 'generated/prisma';

export interface ApiKeyCredentials {
  api_key: string;
}

export interface ResolvedIntegrationCredentials {
  apiKey: string;
  source: 'user' | 'platform';
  userIntegrationId?: string;
  integrationType: IntegrationType;
}

export interface IntegrationCredentialContext {
  userId: string;
  integrationType: IntegrationType;
}
