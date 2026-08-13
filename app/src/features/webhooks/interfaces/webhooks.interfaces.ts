export const WebhookEventTypes = {
  WORKFLOW_RUN_QUEUED: "WORKFLOW_RUN_QUEUED",
  WORKFLOW_RUN_RUNNING: "WORKFLOW_RUN_RUNNING",
  WORKFLOW_RUN_SUCCEEDED: "WORKFLOW_RUN_SUCCEEDED",
  WORKFLOW_RUN_PARTIAL_SUCCESS: "WORKFLOW_RUN_PARTIAL_SUCCESS",
  WORKFLOW_RUN_FAILED: "WORKFLOW_RUN_FAILED",
  WORKFLOW_RUN_CANCELLED: "WORKFLOW_RUN_CANCELLED",
} as const;

export type WebhookEventType = (typeof WebhookEventTypes)[keyof typeof WebhookEventTypes];

export const WebhookDeliveryStatuses = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

export type WebhookDeliveryStatus =
  (typeof WebhookDeliveryStatuses)[keyof typeof WebhookDeliveryStatuses];

export interface WebhookEventCatalogEntry {
  event_type: WebhookEventType;
  name: string;
  label: string;
  description: string;
  sample_payload: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  name: string | null;
  url: string;
  subscribed_events: WebhookEventType[];
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: WebhookEventType;
  workflow_run_id: string | null;
  is_test: boolean;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  http_status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  attempt_number: number;
  duration_ms: number | null;
  created_at: string;
}

export interface CreateWebhookEndpointPayload {
  name?: string;
  url: string;
  secret: string;
  subscribed_events: WebhookEventType[];
}

export interface UpdateWebhookEndpointPayload {
  name?: string;
  url?: string;
  secret?: string;
  subscribed_events?: WebhookEventType[];
  is_active?: boolean;
}

export interface WebhookDeliveryListQuery {
  page?: number;
  limit?: number;
  status?: WebhookDeliveryStatus;
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
