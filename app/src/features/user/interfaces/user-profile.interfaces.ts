export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  default_schedule_tz: string;
  created_at: string;
  updated_at: string;
}

export interface CrawlScheduleTimezone {
  value: string;
  label: string;
}

export interface UpdateUserProfilePayload {
  default_schedule_tz: string;
}
