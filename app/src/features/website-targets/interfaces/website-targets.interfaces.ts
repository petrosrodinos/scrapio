export type BlockSignal = "BLOCKED" | "CHALLENGE";

export type BlockRuleSource =
  | "TITLE"
  | "TEXT"
  | "HTML"
  | "PATH"
  | "SCRIPT_CONTENT"
  | "SELECTOR";

export interface BlockRule {
  id?: string;
  label?: string | null;
  signal: "BLOCKED" | "CHALLENGE";
  source:
    | "TITLE"
    | "TEXT"
    | "HTML"
    | "PATH"
    | "SCRIPT_CONTENT"
    | "SELECTOR";
  pattern: string;
  is_regex?: boolean;
  regex_flags?: string | null;
  position?: number;
}

export interface WebsiteTarget {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  notes: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_message: string | null;
  block_handling_wait_timeout_ms?: number | null;
  block_handling_min_ready_body_length?: number | null;
  block_rules?: BlockRule[];
  created_at: string;
  updated_at: string;
  _count?: {
    workflow_configs: number;
    workflow_runs: number;
    notifications: number;
  };
}

export interface CreateWebsiteTargetPayload {
  name: string;
  base_url: string;
  notes?: string;
  block_handling_wait_timeout_ms?: number | null;
  block_handling_min_ready_body_length?: number | null;
  block_rules?: BlockRule[];
}

export interface UpdateWebsiteTargetPayload extends Partial<CreateWebsiteTargetPayload> {}

export interface WebsiteTargetListQuery {
  page?: number;
  limit?: number;
  search?: string;
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
