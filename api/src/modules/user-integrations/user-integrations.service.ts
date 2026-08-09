import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CredentialEncryptionService } from '@/integrations/credentials/services/credential-encryption.service';
import { maskApiKey } from '@/integrations/credentials/utils/mask-api-key.util';
import { IntegrationsService } from '@/modules/integrations/integrations.service';
import {
  integrationRequiresAiModel,
  integrationRequiresComputerUseModel,
  isAiModelAllowed,
  isComputerUseModelAllowed,
} from '@/shared/config/integrations/integrations.config';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole, ComputerUseModel, IntegrationType, Prisma } from 'generated/prisma';
import { ConnectUserIntegrationDto } from './dto/connect-user-integration.dto';
import { UpdateUserIntegrationDto } from './dto/update-user-integration.dto';
import { UserIntegrationQueryType } from './dto/user-integration-query.schema';
import {
  PaginatedResult,
  UserIntegrationResponse,
} from './interfaces/user-integration.interface';

@Injectable()
export class UserIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialEncryption: CredentialEncryptionService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: UserIntegrationQueryType,
  ): Promise<PaginatedResult<UserIntegrationResponse>> {
    const where = {
      ...(query.user_id
        ? { user_id: query.user_id }
        : !this.canViewAllUsers(authUser)
          ? { user_id: authUser.id }
          : {}),
      ...(query.integration_type && {
        integration_type: query.integration_type,
      }),
      ...(query.is_active !== undefined && { is_active: query.is_active }),
    };

    const [items, total] = await Promise.all([
      this.prisma.userIntegration.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.userIntegration.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next: query.page < Math.ceil(total / query.limit),
        has_prev: query.page > 1,
      },
    };
  }

  async findOne(authUser: AuthUser, id: string): Promise<UserIntegrationResponse> {
    const integration = await this.prisma.userIntegration.findFirst({
      where: {
        id,
        ...(this.canViewAllUsers(authUser)
          ? {}
          : { user_id: authUser.id }),
      },
    });

    if (!integration) {
      throw new NotFoundException('User integration not found');
    }

    return this.toResponse(integration);
  }

  async connect(
    authUser: AuthUser,
    dto: ConnectUserIntegrationDto,
  ): Promise<UserIntegrationResponse> {
    if (
      !this.integrationsService.isAvailable(dto.integration_type, true)
    ) {
      throw new BadRequestException('Integration is not available');
    }

    this.validateComputerUseModel(dto.integration_type, dto.computer_use_model);
    this.validateAiModel(dto.integration_type, dto.ai_model);

    const existing = await this.prisma.userIntegration.findUnique({
      where: {
        user_id_integration_type: {
          user_id: authUser.id,
          integration_type: dto.integration_type,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Integration already connected. Update or disconnect it first.',
      );
    }

    const created = await this.prisma.userIntegration.create({
      data: {
        user_id: authUser.id,
        integration_type: dto.integration_type,
        computer_use_model: dto.computer_use_model ?? null,
        ai_model: dto.ai_model ?? null,
        credentials_encrypted: this.credentialEncryption.encrypt({
          api_key: dto.api_key,
        }),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toResponse(created);
  }

  async update(
    authUser: AuthUser,
    id: string,
    dto: UpdateUserIntegrationDto,
  ): Promise<UserIntegrationResponse> {
    const existing = await this.ensureOwned(authUser, id);

    this.validateComputerUseModel(
      existing.integration_type,
      dto.computer_use_model ?? existing.computer_use_model ?? undefined,
    );
    this.validateAiModel(
      existing.integration_type,
      dto.ai_model ?? existing.ai_model ?? undefined,
    );

    const updated = await this.prisma.userIntegration.update({
      where: { id: existing.id },
      data: {
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.metadata !== undefined && {
          metadata: dto.metadata as Prisma.InputJsonValue,
        }),
        ...(dto.computer_use_model !== undefined && {
          computer_use_model: dto.computer_use_model,
        }),
        ...(dto.ai_model !== undefined && {
          ai_model: dto.ai_model,
        }),
        ...(dto.api_key && {
          credentials_encrypted: this.credentialEncryption.encrypt({
            api_key: dto.api_key,
          }),
        }),
      },
    });

    return this.toResponse(updated);
  }

  async disconnect(authUser: AuthUser, id: string): Promise<void> {
    const existing = await this.ensureOwned(authUser, id);
    await this.prisma.userIntegration.delete({ where: { id: existing.id } });
  }

  private async ensureOwned(authUser: AuthUser, id: string) {
    const integration = await this.prisma.userIntegration.findFirst({
      where: {
        id,
        ...(this.canViewAllUsers(authUser)
          ? {}
          : { user_id: authUser.id }),
      },
    });

    if (!integration) {
      throw new NotFoundException('User integration not found');
    }

    return integration;
  }

  private validateComputerUseModel(
    integrationType: IntegrationType,
    selectedModel?: ComputerUseModel | null,
  ) {
    const requiresModel = integrationRequiresComputerUseModel(integrationType);

    if (requiresModel && !selectedModel) {
      throw new BadRequestException('Computer use model is required');
    }

    if (selectedModel && !requiresModel) {
      throw new BadRequestException(
        'Computer use model is not supported for this integration',
      );
    }

    if (
      selectedModel &&
      !isComputerUseModelAllowed(integrationType, selectedModel)
    ) {
      throw new BadRequestException(
        'Invalid computer use model for this integration',
      );
    }
  }

  private validateAiModel(
    integrationType: IntegrationType,
    selectedModel?: ComputerUseModel | null,
  ) {
    const requiresModel = integrationRequiresAiModel(integrationType);

    if (requiresModel && !selectedModel) {
      throw new BadRequestException('AI model is required');
    }

    if (selectedModel && !requiresModel) {
      throw new BadRequestException(
        'AI model is not supported for this integration',
      );
    }

    if (selectedModel && !isAiModelAllowed(integrationType, selectedModel)) {
      throw new BadRequestException('Invalid AI model for this integration');
    }
  }

  private canViewAllUsers(authUser: AuthUser): boolean {
    return (
      authUser.role === AuthRole.ADMIN ||
      authUser.role === AuthRole.SUPER_ADMIN ||
      authUser.role === AuthRole.SUPPORT
    );
  }

  private toResponse(integration: {
    id: string;
    user_id: string;
    integration_type: IntegrationType;
    computer_use_model: ComputerUseModel | null;
    ai_model: ComputerUseModel | null;
    credentials_encrypted: string;
    is_active: boolean;
    metadata: unknown;
    created_at: Date;
    updated_at: Date;
  }): UserIntegrationResponse {
    const credentials = this.credentialEncryption.decrypt(
      integration.credentials_encrypted,
    );

    return {
      id: integration.id,
      user_id: integration.user_id,
      integration_type: integration.integration_type,
      computer_use_model: integration.computer_use_model,
      ai_model: integration.ai_model,
      api_key_masked: maskApiKey(credentials.api_key),
      is_active: integration.is_active,
      metadata: (integration.metadata as Record<string, unknown> | null) ?? null,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    };
  }
}
