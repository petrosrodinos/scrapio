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
      userIntegrationId: userIntegration.id,
    };
  }

  async hasResolvableCredentials(
    context: IntegrationCredentialContext,
  ): Promise<boolean> {
    try {
      if (context.integrationType === IntegrationType.ANTHROPIC) {
        await this.resolveComputerUseIntegration(context.userId);
        return true;
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
