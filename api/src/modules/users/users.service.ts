import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  CRAWL_SCHEDULE_TIMEZONES,
  isSupportedCrawlScheduleTimezone,
} from '@/shared/config/crawl-schedule-timezones.config';
import { integrationRequiresAiModel } from '@/shared/config/integrations/integrations.config';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  phone: true,
  role: true,
  default_schedule_tz: true,
  default_ai_user_integration_id: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getCrawlScheduleTimezones() {
    return CRAWL_SCHEDULE_TIMEZONES;
  }

  async getProfile(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      select: PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(authUser: AuthUser, dto: UpdateUserProfileDto) {
    if (
      dto.default_schedule_tz === undefined &&
      dto.default_ai_user_integration_id === undefined
    ) {
      throw new BadRequestException('No profile fields to update');
    }

    if (
      dto.default_schedule_tz !== undefined &&
      !isSupportedCrawlScheduleTimezone(dto.default_schedule_tz)
    ) {
      throw new BadRequestException('Unsupported crawl schedule timezone');
    }

    if (dto.default_ai_user_integration_id) {
      await this.assertValidDefaultAiIntegration(
        authUser.id,
        dto.default_ai_user_integration_id,
      );
    }

    return this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        ...(dto.default_schedule_tz !== undefined && {
          default_schedule_tz: dto.default_schedule_tz,
        }),
        ...(dto.default_ai_user_integration_id !== undefined && {
          default_ai_user_integration_id: dto.default_ai_user_integration_id,
        }),
      },
      select: PROFILE_SELECT,
    });
  }

  private async assertValidDefaultAiIntegration(
    userId: string,
    integrationId: string,
  ) {
    const integration = await this.prisma.userIntegration.findFirst({
      where: {
        id: integrationId,
        user_id: userId,
        is_active: true,
        ai_model: { not: null },
      },
    });

    if (
      !integration ||
      !integrationRequiresAiModel(integration.integration_type)
    ) {
      throw new BadRequestException(
        'Default AI integration must be an active AI connection with a model',
      );
    }
  }
}
