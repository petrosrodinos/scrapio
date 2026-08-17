export const JobQueueFilterOptions = [
  { id: "all", label: "All queues" },
  { id: "crawl", label: "crawl" },
  { id: "generation", label: "generation" },
  { id: "plain-scrape", label: "plain-scrape" },
  { id: "browser-agent", label: "browser-agent" },
  { id: "webhook-delivery", label: "webhook-delivery" },
  { id: "ai-batch", label: "ai-batch" },
] as const;
