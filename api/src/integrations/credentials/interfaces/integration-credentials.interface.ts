import { IntegrationType, ComputerUseModel } from 'generated/prisma';

export interface ApiKeyCredentials {
  api_key: string;
}

export interface ResolvedIntegrationCredentials {
  apiKey: string;
  userIntegrationId: string;
  integrationType: IntegrationType;
}

export interface ResolvedComputerUseIntegration {
  apiKey: string;
  model: string;
  computerUseModel: ComputerUseModel;
  userIntegrationId: string;
}

export interface IntegrationCredentialContext {
  userId: string;
  integrationType: IntegrationType;
}
