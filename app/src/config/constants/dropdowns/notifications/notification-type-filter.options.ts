import {
  NotificationTypes,
  type NotificationType,
} from "@/features/notifications/interfaces/notifications.interfaces";

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationTypes.BROKEN_SCRAPER]: "Broken scraper",
  [NotificationTypes.LARGE_CRAWL_FAILURE]: "Crawl failure",
  [NotificationTypes.QUEUE_FAILURE]: "Queue failure",
  [NotificationTypes.WEBSITE_UNAVAILABLE]: "Website unavailable",
};

export function getNotificationTypeLabel(type: NotificationType | string): string {
  return NotificationTypeLabels[type as NotificationType] ?? type;
}

export const NotificationTypeFilterOptions: { id: NotificationType | "all"; label: string }[] = [
  { id: "all", label: "All types" },
  ...Object.values(NotificationTypes).map((notificationType) => ({
    id: notificationType,
    label: NotificationTypeLabels[notificationType],
  })),
];
