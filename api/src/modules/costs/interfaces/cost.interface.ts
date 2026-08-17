import { CostCategory } from 'generated/prisma';

/**
 * Generic recorder input — any feature (AI generation, computer-use runs, future
 * metered integrations) calls CostsService.record() with this shape rather than
 * writing to CostEntry directly.
 */
export interface RecordCostParams {
  userId: string;
  category: CostCategory;
  amount: number;
  provider?: string;
  model?: string;
  currency?: string;
  workflowRunId?: string;
  metadata?: Record<string, unknown>;
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
