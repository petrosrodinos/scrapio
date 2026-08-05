import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import type {
  ActivityFeedItem,
  DashboardResponse,
} from "../interfaces/dashboard.interfaces";

type LegacyActivityFeedItem = {
  type: ActivityFeedItem["type"];
  id?: string;
  website_target_id?: string;
  website_target_name?: string | null;
  scraper_id?: string | null;
  crawl_run_id?: string | null;
  generation_run_id?: string | null;
  message?: string | null;
  summary?: string | null;
  occurred_at?: string;
  timestamp?: string;
};

type LegacyDashboardPayload = Partial<DashboardResponse> & {
  kpis?: Partial<DashboardResponse>;
  activity?: LegacyActivityFeedItem[];
  activity_feed?: LegacyActivityFeedItem[];
};

const normalizeActivityFeed = (
  items: LegacyActivityFeedItem[] | undefined,
): ActivityFeedItem[] => {
  if (!items?.length) {
    return [];
  }

  return items.map((item, index) => ({
    type: item.type,
    id: item.id ?? `${item.type}-${item.occurred_at ?? item.timestamp ?? index}`,
    website_target_id: item.website_target_id ?? "",
    website_target_name: item.website_target_name ?? null,
    scraper_id: item.scraper_id,
    crawl_run_id: item.crawl_run_id,
    generation_run_id: item.generation_run_id,
    message: item.message ?? item.summary ?? null,
    occurred_at: item.occurred_at ?? item.timestamp ?? new Date(0).toISOString(),
  }));
};

const normalizeDashboardResponse = (payload: LegacyDashboardPayload): DashboardResponse => {
  const source = payload.kpis ? { ...payload.kpis, ...payload } : payload;
  const activitySource = payload.activity_feed ?? payload.activity;

  return {
    scrapers_total: source.scrapers_total ?? 0,
    scrapers_active: source.scrapers_active ?? 0,
    scrapers_broken: source.scrapers_broken ?? 0,
    targets_total: source.targets_total ?? 0,
    running_crawls: source.running_crawls ?? 0,
    failed_crawls_24h: source.failed_crawls_24h ?? 0,
    last_crawl_at: source.last_crawl_at ?? null,
    queue_waiting: source.queue_waiting ?? 0,
    queue_active: source.queue_active ?? 0,
    queue_failed: source.queue_failed ?? 0,
    active_generation_runs: source.active_generation_runs ?? 0,
    extracted_items_total: source.extracted_items_total ?? 0,
    activity_feed: normalizeActivityFeed(activitySource),
  };
};

export const getDashboard = async (): Promise<DashboardResponse> => {
  try {
    const response = await axiosInstance.get<LegacyDashboardPayload>(ApiRoutes.dashboard.root);
    return normalizeDashboardResponse(response.data);
  } catch {
    throw new Error("Failed to fetch dashboard. Please try again.");
  }
};
