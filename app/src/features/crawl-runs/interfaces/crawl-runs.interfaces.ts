export const RunStatuses = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type RunStatus = (typeof RunStatuses)[keyof typeof RunStatuses];

export const WorkflowTypes = {
  SCRAPER: "SCRAPER",
  BROWSER_AGENT: "BROWSER_AGENT",
  PLAIN_SCRAPE: "PLAIN_SCRAPE",
} as const;

export type WorkflowType = (typeof WorkflowTypes)[keyof typeof WorkflowTypes];

export const ExtractionScopes = {
  COMBINED: "COMBINED",
  PER_URL: "PER_URL",
} as const;

export type ExtractionScope = (typeof ExtractionScopes)[keyof typeof ExtractionScopes];

export const ExtractionFormatStatuses = {
  VALID: "VALID",
  INVALID: "INVALID",
  FAILED: "FAILED",
} as const;

export type ExtractionFormatStatus =
  (typeof ExtractionFormatStatuses)[keyof typeof ExtractionFormatStatuses];

export interface ExtractionResult {
  id: string;
  workflow_run_id: string | null;
  plain_scraped_page_id: string | null;
  extraction_schema_version_id: string | null;
  structured_status: ExtractionFormatStatus | null;
  structured_data: Record<string, unknown> | null;
  structured_raw_ai_output: unknown;
  structured_validation_errors: unknown;
  structured_attempts: number;
  markdown_status: ExtractionFormatStatus | null;
  markdown: string | null;
  markdown_validation_errors: unknown;
  ai_usage: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PlainScrapedPage {
  id: string;
  workflow_run_id: string;
  requested_url: string;
  final_url: string | null;
  http_status: number | null;
  success: boolean;
  raw_html: string | null;
  cleaned_content: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  extraction_result?: ExtractionResult | null;
}

export const ComputerActionTypes = {
  NAVIGATE: "NAVIGATE",
  CLICK: "CLICK",
  TYPE: "TYPE",
  SCROLL: "SCROLL",
  SCREENSHOT: "SCREENSHOT",
  EXTRACT: "EXTRACT",
  WAIT: "WAIT",
  KEY_PRESS: "KEY_PRESS",
} as const;

export interface ComputerUseStep {
  id: string;
  workflow_run_id: string | null;
  step_index: number;
  action_type: string;
  action_payload: Record<string, unknown>;
  screenshot_before_url: string | null;
  screenshot_after_url: string | null;
  model_reasoning: string | null;
  created_at: string;
}

export interface ScraperExecutionTrace {
  id: string;
  workflow_config_id: string;
  workflow_run_id: string | null;
  steps: unknown;
  success: boolean;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRunJobLogSummary {
  id: string;
  queue_name: string;
  job_name: string | null;
  status: string;
  attempt: number;
  max_attempts: number | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  user_id: string;
  type: WorkflowType;
  workflow_config_id: string;
  website_target_id: string | null;
  scraper_version_id: string | null;
  url: string | null;
  max_steps: number | null;
  urls: string[] | null;
  extraction_scope: ExtractionScope | null;
  output_formats: string[] | null;
  extraction_schema_version_id: string | null;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  visited_urls: string[] | null;
  browser_actions: unknown;
  collected_data: Record<string, unknown> | null;
  ai_usage: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  website_target?: { name: string } | null;
  workflow_config?: { name: string } | null;
}

export interface WorkflowRunDetail extends WorkflowRun {
  execution_traces: ScraperExecutionTrace[];
  job_logs: WorkflowRunJobLogSummary[];
  diagnostics_package?: { id: string; mode: string } | null;
  extraction_result?: ExtractionResult | null;
  pages?: PlainScrapedPage[];
  steps?: ComputerUseStep[];
}

export interface WorkflowRunListQuery {
  page?: number;
  limit?: number;
  status?: RunStatus;
  type?: WorkflowType;
  website_target_id?: string;
  workflow_config_id?: string;
  date_from?: string;
  date_to?: string;
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

export interface WorkflowRunListResponse extends PaginatedResponse<WorkflowRun> {}

export interface DeleteWorkflowRunsPayload {
  workflow_run_ids: string[];
}

export type CrawlRunStatus = RunStatus;
export type CrawlRun = WorkflowRun;
export type CrawlRunDetail = WorkflowRunDetail;
export type CrawlRunListQuery = WorkflowRunListQuery;
export type CrawlRunListResponse = WorkflowRunListResponse;
export type DeleteCrawlRunsPayload = DeleteWorkflowRunsPayload;
export const CrawlRunStatuses = RunStatuses;
