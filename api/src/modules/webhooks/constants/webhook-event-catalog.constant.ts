import { RunStatus, WebhookEventType } from 'generated/prisma';

export interface WebhookEventCatalogEntry {
  event_type: WebhookEventType;
  name: string;
  label: string;
  description: string;
  sample_payload: object;
}

function buildSamplePayload(name: string, status: RunStatus, extra: Record<string, unknown> = {}) {
  return {
    event: name,
    created_at: '2026-08-13T15:00:00.000Z',
    data: {
      workflow_run_id: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d',
      workflow_config_id: '7c1e6b2a-4321-4f5e-8a9b-0c1d2e3f4a5b',
      type: 'SCRAPER',
      status,
      error_message: null,
      started_at: '2026-08-13T14:59:50.000Z',
      finished_at: null,
      duration_ms: null,
      ...extra,
    },
  };
}

export const WEBHOOK_EVENT_CATALOG: WebhookEventCatalogEntry[] = [
  {
    event_type: WebhookEventType.WORKFLOW_RUN_QUEUED,
    name: 'workflow_run.queued',
    label: 'Run queued',
    description: 'A scraper, browser agent, or plain scrape run was queued for execution.',
    sample_payload: buildSamplePayload('workflow_run.queued', RunStatus.QUEUED),
  },
  {
    event_type: WebhookEventType.WORKFLOW_RUN_RUNNING,
    name: 'workflow_run.running',
    label: 'Run started',
    description: 'A queued run started executing.',
    sample_payload: buildSamplePayload('workflow_run.running', RunStatus.RUNNING),
  },
  {
    event_type: WebhookEventType.WORKFLOW_RUN_SUCCEEDED,
    name: 'workflow_run.succeeded',
    label: 'Run succeeded',
    description: 'A run finished successfully with no errors.',
    sample_payload: buildSamplePayload('workflow_run.succeeded', RunStatus.SUCCESS, {
      finished_at: '2026-08-13T15:00:00.000Z',
      duration_ms: 10000,
    }),
  },
  {
    event_type: WebhookEventType.WORKFLOW_RUN_PARTIAL_SUCCESS,
    name: 'workflow_run.partial_success',
    label: 'Run partially succeeded',
    description: 'A run finished, but some pages or items failed to extract.',
    sample_payload: buildSamplePayload('workflow_run.partial_success', RunStatus.PARTIAL_SUCCESS, {
      finished_at: '2026-08-13T15:00:00.000Z',
      duration_ms: 10000,
    }),
  },
  {
    event_type: WebhookEventType.WORKFLOW_RUN_FAILED,
    name: 'workflow_run.failed',
    label: 'Run failed',
    description: 'A run failed to complete.',
    sample_payload: buildSamplePayload('workflow_run.failed', RunStatus.FAILED, {
      error_message: 'Timed out waiting for page to load',
      finished_at: '2026-08-13T15:00:00.000Z',
      duration_ms: 10000,
    }),
  },
  {
    event_type: WebhookEventType.WORKFLOW_RUN_CANCELLED,
    name: 'workflow_run.cancelled',
    label: 'Run cancelled',
    description: 'A run was manually cancelled before it finished.',
    sample_payload: buildSamplePayload('workflow_run.cancelled', RunStatus.CANCELLED, {
      error_message: 'Cancelled by admin',
      finished_at: '2026-08-13T15:00:00.000Z',
      duration_ms: 5000,
    }),
  },
];

export const RUN_STATUS_TO_WEBHOOK_EVENT: Record<RunStatus, WebhookEventType> = {
  [RunStatus.QUEUED]: WebhookEventType.WORKFLOW_RUN_QUEUED,
  [RunStatus.RUNNING]: WebhookEventType.WORKFLOW_RUN_RUNNING,
  [RunStatus.SUCCESS]: WebhookEventType.WORKFLOW_RUN_SUCCEEDED,
  [RunStatus.PARTIAL_SUCCESS]: WebhookEventType.WORKFLOW_RUN_PARTIAL_SUCCESS,
  [RunStatus.FAILED]: WebhookEventType.WORKFLOW_RUN_FAILED,
  [RunStatus.CANCELLED]: WebhookEventType.WORKFLOW_RUN_CANCELLED,
};

export const WEBHOOK_EVENT_NAME_BY_TYPE: Record<WebhookEventType, string> = Object.fromEntries(
  WEBHOOK_EVENT_CATALOG.map((entry) => [entry.event_type, entry.name]),
) as Record<WebhookEventType, string>;
