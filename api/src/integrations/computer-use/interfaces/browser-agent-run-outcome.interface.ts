import { CaptureEntry } from '@/integrations/api-capture/interfaces/capture-entry.interface';

export interface BrowserAgentAiUsage {
  input_tokens: number;
  output_tokens: number;
  model_calls: number;
}

export interface BrowserAgentActionLogEntry {
  step_index: number;
  action: string;
  selector?: string;
  url?: string;
  text?: string;
  reasoning?: string | null;
}

export interface BrowserAgentRunOutcome {
  findings: Record<string, unknown> | null;
  visitedUrls: string[];
  browserActions: BrowserAgentActionLogEntry[];
  aiUsage: BrowserAgentAiUsage;
  failureReason: string | null;
  cancelled: boolean;
  /** Present only when the run's config had capture_api enabled. */
  capturedRequests?: CaptureEntry[];
}
