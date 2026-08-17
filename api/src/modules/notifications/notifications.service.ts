import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Notification as NotificationModel, Prisma } from 'generated/prisma';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { notificationUserWhere } from '@/shared/utils/user/user-scope.utils';
import { NotificationQueryType } from './dto/notification-query.schema';
import {
  CreateNotificationInput,
  PaginatedResult,
} from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateNotificationInput): void {
    setImmediate(async () => {
      try {
        await this.prisma.notification.create({ data: input });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create notification: ${message}`);
      }
    });
  }

  async findAll(
    authUser: AuthUser,
    query: NotificationQueryType,
  ): Promise<PaginatedResult<NotificationModel>> {
    const where: Prisma.NotificationWhereInput = {
      ...notificationUserWhere(authUser, query.user_id),
      ...(query.type && { type: query.type }),
      ...(query.severity && { severity: query.severity }),
      ...(query.is_read !== undefined && { is_read: query.is_read }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: items,
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

  async markRead(authUser: AuthUser, id: string): Promise<NotificationModel> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, ...notificationUserWhere(authUser) },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.is_read) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  async markAllRead(authUser: AuthUser): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { is_read: false, ...notificationUserWhere(authUser) },
      data: { is_read: true },
    });

    return { updated: result.count };
  }

  async remove(authUser: AuthUser, id: string): Promise<{ deleted: number }> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, ...notificationUserWhere(authUser) },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { deleted: 1 };
  }

  async removeMany(
    authUser: AuthUser,
    ids: string[],
  ): Promise<{ deleted: number }> {
    const uniqueIds = [...new Set(ids)];
    const result = await this.prisma.notification.deleteMany({
      where: { id: { in: uniqueIds }, ...notificationUserWhere(authUser) },
    });

    return { deleted: result.count };
  }
}
