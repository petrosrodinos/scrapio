import { RunStatus, WorkflowType } from 'generated/prisma';

export const WORKFLOW_RUN_STATUS_CHANGED_EVENT = 'workflow_run.status_changed';

export interface WorkflowRunStatusChangedEvent {
  workflowRunId: string;
  userId: string;
  workflowConfigId: string;
  type: WorkflowType;
  status: RunStatus;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  durationMs?: number | null;
}
