import {
  WebhookDeliveryStatuses,
  type WebhookDeliveryStatus,
} from "@/features/webhooks/interfaces/webhooks.interfaces";

export const WebhookDeliveryStatusFilterOptions: {
  id: WebhookDeliveryStatus | "all";
  label: string;
}[] = [
  { id: "all", label: "All statuses" },
  { id: WebhookDeliveryStatuses.SUCCESS, label: "Success" },
  { id: WebhookDeliveryStatuses.FAILED, label: "Failed" },
  { id: WebhookDeliveryStatuses.PENDING, label: "Pending" },
];
