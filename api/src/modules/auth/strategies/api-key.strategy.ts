import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole } from 'generated/prisma';
import { hashApiKeyToken, isApiKeyFormat } from '@/modules/api-keys/utils/api-key.util';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(BearerStrategy, 'api-key') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(token: string): Promise<AuthUser> {
    if (!isApiKeyFormat(token)) {
      throw new UnauthorizedException('Invalid API key');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key_hash: hashApiKeyToken(token) },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!apiKey || apiKey.revoked_at) {
      throw new UnauthorizedException('API key is invalid or has been revoked');
    }
    if (!apiKey.is_active) {
      throw new UnauthorizedException('API key is disabled');
    }
    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    setImmediate(() => {
      this.prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { last_used_at: new Date() } })
        .catch(() => {});
    });

    return { id: apiKey.user.id, role: apiKey.user.role as AuthRole };
  }
}
