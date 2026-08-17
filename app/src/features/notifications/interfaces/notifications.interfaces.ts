export const NotificationTypes = {
  QUEUE_FAILURE: "QUEUE_FAILURE",
  BROKEN_SCRAPER: "BROKEN_SCRAPER",
  WEBSITE_UNAVAILABLE: "WEBSITE_UNAVAILABLE",
  LARGE_CRAWL_FAILURE: "LARGE_CRAWL_FAILURE",
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationSeverities = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export type NotificationSeverity =
  (typeof NotificationSeverities)[keyof typeof NotificationSeverities];

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  website_target_id: string | null;
  workflow_config_id: string | null;
  workflow_run_id: string | null;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  type?: NotificationType;
  severity?: NotificationSeverity;
  user_id?: string;
  is_read?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface MarkAllReadResponse {
  updated: number;
}

export interface DeleteNotificationsPayload {
  ids: string[];
}

export interface DeleteNotificationsResponse {
  deleted: number;
}
