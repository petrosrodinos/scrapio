export const CostCategories = {
  STRUCTURED_EXTRACTION: "STRUCTURED_EXTRACTION",
  MARKDOWN_GENERATION: "MARKDOWN_GENERATION",
  EMBEDDING: "EMBEDDING",
  BROWSER_AGENT_RUN: "BROWSER_AGENT_RUN",
  SCRAPER_GENERATION: "SCRAPER_GENERATION",
} as const;

export type CostCategory = (typeof CostCategories)[keyof typeof CostCategories];

export interface CostEntry {
  id: string;
  category: CostCategory;
  provider: string | null;
  model: string | null;
  amount: number;
  currency: string;
  workflow_run_id: string | null;
  created_at: string;
}

export interface CostSummaryByCategory {
  category: CostCategory;
  total_cost: number;
  entries_count: number;
}

export interface CostSummary {
  total_cost: number;
  currency: string;
  by_category: CostSummaryByCategory[];
}

export interface CostQuery {
  page?: number;
  limit?: number;
  category?: CostCategory;
  user_id?: string;
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
