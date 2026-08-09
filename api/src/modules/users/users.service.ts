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
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  phone: true,
  role: true,
  default_schedule_tz: true,
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
    if (dto.default_schedule_tz === undefined) {
      throw new BadRequestException('No profile fields to update');
    }

    if (!isSupportedCrawlScheduleTimezone(dto.default_schedule_tz)) {
      throw new BadRequestException('Unsupported crawl schedule timezone');
    }

    return this.prisma.user.update({
      where: { id: authUser.id },
      data: { default_schedule_tz: dto.default_schedule_tz },
      select: PROFILE_SELECT,
    });
  }
}
