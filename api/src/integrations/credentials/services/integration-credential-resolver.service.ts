import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { IntegrationType } from 'generated/prisma';
import { getComputerUseModelApiId } from '@/shared/config/integrations/computer-use-models.config';
import {
  IntegrationCredentialContext,
  ResolvedComputerUseIntegration,
  ResolvedIntegrationCredentials,
} from '../interfaces/integration-credentials.interface';
import { CredentialEncryptionService } from './credential-encryption.service';

@Injectable()
export class IntegrationCredentialResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialEncryption: CredentialEncryptionService,
  ) {}

  async resolveApiKey(
    context: IntegrationCredentialContext,
  ): Promise<ResolvedIntegrationCredentials> {
    const userIntegration = await this.findActiveIntegration(context);

    const credentials = this.credentialEncryption.decrypt(
      userIntegration.credentials_encrypted,
    );

    return {
      apiKey: credentials.api_key,
      userIntegrationId: userIntegration.id,
      integrationType: context.integrationType,
      aiModel: userIntegration.ai_model
        ? getComputerUseModelApiId(userIntegration.ai_model)
        : undefined,
    };
  }

  async resolveDefaultAiIntegration(
    userId: string,
  ): Promise<ResolvedIntegrationCredentials> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { default_ai_user_integration_id: true },
    });

    const preferredId = user?.default_ai_user_integration_id ?? null;

    if (preferredId) {
      const preferred = await this.prisma.userIntegration.findFirst({
        where: {
          id: preferredId,
          user_id: userId,
          is_active: true,
          ai_model: { not: null },
          integration_type: {
            in: [
              IntegrationType.OPENAI,
              IntegrationType.GEMINI,
              IntegrationType.DEEPSEEK,
            ],
          },
        },
      });

      if (preferred?.ai_model) {
        const credentials = this.credentialEncryption.decrypt(
          preferred.credentials_encrypted,
        );

        return {
          apiKey: credentials.api_key,
          userIntegrationId: preferred.id,
          integrationType: preferred.integration_type,
          aiModel: getComputerUseModelApiId(preferred.ai_model),
        };
      }
    }

    const fallback = await this.prisma.userIntegration.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        ai_model: { not: null },
        integration_type: {
          in: [
            IntegrationType.OPENAI,
            IntegrationType.GEMINI,
            IntegrationType.DEEPSEEK,
          ],
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!fallback?.ai_model) {
      throw new Error(
        'No active AI integration with a model configured for user',
      );
    }

    const credentials = this.credentialEncryption.decrypt(
      fallback.credentials_encrypted,
    );

    return {
      apiKey: credentials.api_key,
      userIntegrationId: fallback.id,
      integrationType: fallback.integration_type,
      aiModel: getComputerUseModelApiId(fallback.ai_model),
    };
  }

  async resolveComputerUseIntegration(
    userId: string,
  ): Promise<ResolvedComputerUseIntegration> {
    const userIntegration = await this.prisma.userIntegration.findFirst({
      where: {
        user_id: userId,
        integration_type: IntegrationType.ANTHROPIC,
        is_active: true,
        computer_use_model: { not: null },
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!userIntegration?.computer_use_model) {
      throw new Error(
        'No active Anthropic integration with a computer use model configured',
      );
    }

    const credentials = this.credentialEncryption.decrypt(
      userIntegration.credentials_encrypted,
    );

    return {
      apiKey: credentials.api_key,
      model: getComputerUseModelApiId(userIntegration.computer_use_model),
      computerUseModel: userIntegration.computer_use_model,
      integrationType: userIntegration.integration_type,
      userIntegrationId: userIntegration.id,
    };
  }

  async hasResolvableCredentials(
    context: IntegrationCredentialContext,
  ): Promise<boolean> {
    try {
      if (context.integrationType === IntegrationType.ANTHROPIC) {
        const computerUse = await this.prisma.userIntegration.findFirst({
          where: {
            user_id: context.userId,
            integration_type: IntegrationType.ANTHROPIC,
            is_active: true,
            computer_use_model: { not: null },
          },
        });
        return !!computerUse;
      }

      await this.resolveApiKey(context);
      return true;
    } catch {
      return false;
    }
  }

  private async findActiveIntegration(context: IntegrationCredentialContext) {
    const userIntegration = await this.prisma.userIntegration.findFirst({
      where: {
        user_id: context.userId,
        integration_type: context.integrationType,
        is_active: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (!userIntegration) {
      throw new Error(
        `No active ${context.integrationType} integration configured for user`,
      );
    }

    return userIntegration;
  }
}
