export const CrawlRunStatuses = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type CrawlRunStatus = (typeof CrawlRunStatuses)[keyof typeof CrawlRunStatuses];

export interface ScraperExecutionTrace {
  id: string;
  scraper_id: string;
  crawl_run_id: string | null;
  steps: unknown;
  success: boolean;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlRunJobLogSummary {
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

export interface CrawlRun {
  id: string;
  website_target_id: string;
  scraper_id: string | null;
  status: CrawlRunStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  total_found: number;
  total_new_listings: number;
  total_refreshed_listings: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  website_target?: { name: string };
  scraper?: { name: string } | null;
}

export interface CrawlRunDetail extends CrawlRun {
  execution_traces: ScraperExecutionTrace[];
  job_logs: CrawlRunJobLogSummary[];
  diagnostics_package?: { id: string; mode: string } | null;
}

export interface CrawlRunListQuery {
  page?: number;
  limit?: number;
  status?: CrawlRunStatus;
  website_target_id?: string;
  scraper_id?: string;
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

export interface CrawlRunListResponse extends PaginatedResponse<CrawlRun> {}

export interface DeleteCrawlRunsPayload {
  crawl_run_ids: string[];
}
