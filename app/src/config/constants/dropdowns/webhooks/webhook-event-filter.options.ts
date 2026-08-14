import {
  WebhookEventTypes,
  type WebhookEventType,
} from "@/features/webhooks/interfaces/webhooks.interfaces";

export const WebhookEventFormOptions: { id: WebhookEventType; label: string }[] = [
  { id: WebhookEventTypes.WORKFLOW_RUN_QUEUED, label: "Run queued" },
  { id: WebhookEventTypes.WORKFLOW_RUN_RUNNING, label: "Run started" },
  { id: WebhookEventTypes.WORKFLOW_RUN_SUCCEEDED, label: "Run succeeded" },
  { id: WebhookEventTypes.WORKFLOW_RUN_PARTIAL_SUCCESS, label: "Run partially succeeded" },
  { id: WebhookEventTypes.WORKFLOW_RUN_FAILED, label: "Run failed" },
  { id: WebhookEventTypes.WORKFLOW_RUN_CANCELLED, label: "Run cancelled" },
];

export function getWebhookEventLabel(eventType: WebhookEventType | string): string {
  return WebhookEventFormOptions.find((option) => option.id === eventType)?.label ?? eventType;
}

export const WebhookEventFilterOptions: { id: WebhookEventType | "all"; label: string }[] = [
  { id: "all", label: "All events" },
  ...WebhookEventFormOptions,
];
