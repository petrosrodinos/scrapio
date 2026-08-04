import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CreateNotificationInput } from './interfaces/notification.interface';

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
}
