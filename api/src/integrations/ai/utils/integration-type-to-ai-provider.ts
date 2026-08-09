import { IntegrationType } from 'generated/prisma';
import { AiProvider, AiProviders } from '../interfaces/ai.interface';

export function integrationTypeToAiProvider(
  integrationType: IntegrationType,
): AiProvider {
  switch (integrationType) {
    case IntegrationType.OPENAI:
      return AiProviders.openai;
    case IntegrationType.DEEPSEEK:
      return AiProviders.deepseek;
    case IntegrationType.GEMINI:
      return AiProviders.gemini;
    default:
      throw new Error(
        `Integration type ${integrationType} is not an AI text provider`,
      );
  }
}
