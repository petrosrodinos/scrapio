import type { OutputFormat } from "@/features/scraper-generation/interfaces/output-config.interfaces";

export interface BrowserAgentConfig {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  url: string;
  output_formats: OutputFormat[];
  extraction_schema_version_id: string | null;
  schedule_cron: string | null;
  schedule_enabled: boolean;
  created_at: string;
  updated_at: string;
  extraction_schema_version?: {
    id: string;
    definition: Record<string, unknown>;
  } | null;
}

export interface CreateBrowserAgentConfigPayload {
  name: string;
  description?: string | null;
  url: string;
  output_formats: OutputFormat[];
  output_schema?: Record<string, unknown>;
  schedule_cron?: string | null;
}

export interface UpdateBrowserAgentConfigPayload extends Partial<CreateBrowserAgentConfigPayload> {}

export interface BrowserAgentConfigListQuery {
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
