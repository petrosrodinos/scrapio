import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { IntegrationType } from 'generated/prisma';
import {
  IntegrationCredentialContext,
  ResolvedIntegrationCredentials,
} from '../interfaces/integration-credentials.interface';
import { CredentialEncryptionService } from './credential-encryption.service';

const PLATFORM_ENV_KEYS: Record<IntegrationType, string> = {
  [IntegrationType.ANTHROPIC]: 'ANTHROPIC_API_KEY',
  [IntegrationType.OPENAI]: 'OPENAI_API_KEY',
  [IntegrationType.GEMINI]: 'GEMINI_API_KEY',
  [IntegrationType.DEEPSEEK]: 'DEEPSEEK_API_KEY',
};

@Injectable()
export class IntegrationCredentialResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly credentialEncryption: CredentialEncryptionService,
  ) {}

  async resolveApiKey(
    context: IntegrationCredentialContext,
  ): Promise<ResolvedIntegrationCredentials> {
    const userIntegration = await this.prisma.userIntegration.findFirst({
      where: {
        user_id: context.userId,
        integration_type: context.integrationType,
        is_active: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    if (userIntegration) {
      const credentials = this.credentialEncryption.decrypt(
        userIntegration.credentials_encrypted,
      );

      return {
        apiKey: credentials.api_key,
        source: 'user',
        userIntegrationId: userIntegration.id,
        integrationType: context.integrationType,
      };
    }

    const platformKey = this.resolvePlatformApiKey(context.integrationType);

    if (!platformKey) {
      throw new Error(
        `No active ${context.integrationType} integration configured for user and no platform fallback key is set`,
      );
    }

    return {
      apiKey: platformKey,
      source: 'platform',
      integrationType: context.integrationType,
    };
  }

  async hasResolvableCredentials(
    context: IntegrationCredentialContext,
  ): Promise<boolean> {
    try {
      await this.resolveApiKey(context);
      return true;
    } catch {
      return false;
    }
  }

  private resolvePlatformApiKey(
    integrationType: IntegrationType,
  ): string | null {
    const envKey = PLATFORM_ENV_KEYS[integrationType];
    return this.configService.get<string>(envKey) ?? null;
  }
}
