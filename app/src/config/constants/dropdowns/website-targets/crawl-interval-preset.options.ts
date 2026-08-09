export const ManualCrawlIntervalId = "manual";

export const CrawlIntervalPresetOptions: { id: string; label: string }[] = [
  { id: ManualCrawlIntervalId, label: "Manual only" },
  { id: "0 * * * *", label: "Every hour" },
  { id: "0 */2 * * *", label: "Every 2 hours" },
  { id: "0 */3 * * *", label: "Every 3 hours" },
  { id: "0 */4 * * *", label: "Every 4 hours" },
  { id: "0 */6 * * *", label: "Every 6 hours" },
  { id: "0 */8 * * *", label: "Every 8 hours" },
  { id: "0 */12 * * *", label: "Every 12 hours" },
  { id: "0 0 * * *", label: "Once a day at midnight (Athens)" },
  { id: "0 6 * * *", label: "Once a day at 06:00 (Athens)" },
  { id: "0 9 * * *", label: "Once a day at 09:00 (Athens)" },
  { id: "0 12 * * *", label: "Once a day at noon (Athens)" },
  { id: "0 18 * * *", label: "Once a day at 18:00 (Athens)" },
  { id: "0 0 * * 1", label: "Weekly on Monday at midnight (Athens)" },
  { id: "0 9 * * 1-5", label: "Weekdays at 09:00 (Athens)" },
];

export function isManualCrawlInterval(cron: string | null | undefined): boolean {
  return cron == null || cron === "" || cron === ManualCrawlIntervalId;
}

export function crawlIntervalToSelectKey(cron: string | null | undefined): string {
  return isManualCrawlInterval(cron) ? ManualCrawlIntervalId : cron!;
}

export function selectKeyToCrawlInterval(key: string): string | null {
  return key === ManualCrawlIntervalId ? null : key;
}

export function getCrawlIntervalPresetLabel(cron: string | null | undefined): string {
  if (isManualCrawlInterval(cron)) return "Manual only";
  return CrawlIntervalPresetOptions.find((option) => option.id === cron)?.label ?? cron!;
}

export function isCrawlIntervalPreset(cron: string | null | undefined): boolean {
  if (isManualCrawlInterval(cron)) return true;
  return CrawlIntervalPresetOptions.some((option) => option.id === cron);
}
