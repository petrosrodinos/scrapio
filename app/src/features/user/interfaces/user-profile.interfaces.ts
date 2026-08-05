export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  crawl_schedule_tz: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlScheduleTimezone {
  value: string;
  label: string;
}

export interface UpdateUserProfilePayload {
  crawl_schedule_tz: string;
}
