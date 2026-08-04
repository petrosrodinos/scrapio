import {
  NotificationSeverity,
  NotificationType,
  Prisma,
} from 'generated/prisma';

export type CreateNotificationInput = Prisma.NotificationUncheckedCreateInput;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export type { NotificationType, NotificationSeverity };
