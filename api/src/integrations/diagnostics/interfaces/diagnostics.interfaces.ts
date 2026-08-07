import { DiagnosticsMode } from 'generated/prisma';

export interface DiagnosticsRunContext {
  workflowRunId: string;
  workflowConfigId: string;
  scraperVersion?: number;
  url: string;
  mode: DiagnosticsMode | string;
  retryNumber?: number;
  workerId?: string;
}

export interface DiagnosticsOutcome {
  success: boolean;
  errorSummary?: string | null;
}
