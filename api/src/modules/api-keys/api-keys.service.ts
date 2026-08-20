import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { ApiKey } from 'generated/prisma';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyCreatedEntity } from './entities/api-key-created.entity';
import {
  API_KEY_PREFIX_DISPLAY_LENGTH,
  generateApiKey,
  hashApiKeyToken,
} from './utils/api-key.util';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authUser: AuthUser, dto: CreateApiKeyDto): Promise<ApiKeyCreatedEntity> {
    let expiresAt: Date | null = null;
    if (dto.expires_at) {
      expiresAt = new Date(dto.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        throw new BadRequestException('expires_at must be a future date');
      }
    }

    const raw = generateApiKey();
    const created = await this.prisma.apiKey.create({
      data: {
        user_id: authUser.id,
        name: dto.name,
        key_prefix: raw.slice(0, API_KEY_PREFIX_DISPLAY_LENGTH),
        key_hash: hashApiKeyToken(raw),
        expires_at: expiresAt,
      },
    });

    return { ...this.toResponse(created), api_key: raw };
  }

  async findAll(authUser: AuthUser): Promise<ApiKeyEntity[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { user_id: authUser.id },
      orderBy: { created_at: 'desc' },
    });
    return keys.map((key) => this.toResponse(key));
  }

  async update(authUser: AuthUser, id: string, dto: UpdateApiKeyDto): Promise<ApiKeyEntity> {
    const existing = await this.ensureOwned(authUser, id);

    if (dto.is_active === true && existing.revoked_at) {
      throw new BadRequestException('A revoked API key cannot be re-enabled');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
    return this.toResponse(updated);
  }

  async revoke(authUser: AuthUser, id: string): Promise<{ message: string }> {
    const existing = await this.ensureOwned(authUser, id);
    if (!existing.revoked_at) {
      await this.prisma.apiKey.update({
        where: { id: existing.id },
        data: { revoked_at: new Date() },
      });
    }
    return { message: 'API key revoked successfully' };
  }

  async remove(authUser: AuthUser, id: string): Promise<{ message: string }> {
    const existing = await this.ensureOwned(authUser, id);
    await this.prisma.apiKey.delete({ where: { id: existing.id } });
    return { message: 'API key deleted successfully' };
  }

  private async ensureOwned(authUser: AuthUser, id: string): Promise<ApiKey> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, user_id: authUser.id },
    });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    return key;
  }

  private toResponse(key: ApiKey): ApiKeyEntity {
    return {
      id: key.id,
      name: key.name,
      key_prefix: key.key_prefix,
      is_active: key.is_active,
      last_used_at: key.last_used_at,
      expires_at: key.expires_at,
      revoked_at: key.revoked_at,
      created_at: key.created_at,
    };
  }
}
