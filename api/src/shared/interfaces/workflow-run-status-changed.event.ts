import { RunStatus, WorkflowType } from 'generated/prisma';

export const WORKFLOW_RUN_STATUS_CHANGED_EVENT = 'workflow_run.status_changed';

export interface WorkflowRunStatusChangedEvent {
  workflowRunId: string;
  userId: string;
  workflowConfigId: string;
  type: WorkflowType;
  status: RunStatus;
  // Snapshot of WorkflowRun.persist_results. When false and status is terminal, the webhook
  // listener embeds the full result in the delivered payload since it's about to be purged.
  persistResults: boolean;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  durationMs?: number | null;
}
