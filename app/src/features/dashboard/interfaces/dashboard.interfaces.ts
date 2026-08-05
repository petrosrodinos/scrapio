export const DashboardActivityTypes = {
  CRAWL: "crawl",
  CRAWL_FAILED: "crawl_failed",
  SCRAPER_BROKEN: "scraper_broken",
  GENERATION: "generation",
} as const;

export type DashboardActivityType =
  (typeof DashboardActivityTypes)[keyof typeof DashboardActivityTypes];

export interface ActivityFeedItem {
  type: DashboardActivityType;
  id: string;
  website_target_id: string;
  website_target_name: string | null;
  scraper_id?: string | null;
  crawl_run_id?: string | null;
  generation_run_id?: string | null;
  message?: string | null;
  occurred_at: string;
}

export interface DashboardResponse {
  scrapers_total: number;
  scrapers_active: number;
  scrapers_broken: number;
  targets_total: number;
  running_crawls: number;
  failed_crawls_24h: number;
  last_crawl_at: string | null;
  queue_waiting: number;
  queue_active: number;
  queue_failed: number;
  active_generation_runs: number;
  extracted_items_total: number;
  activity_feed: ActivityFeedItem[];
}
