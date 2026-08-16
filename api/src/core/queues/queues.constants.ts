export const BULL_BOARD_ADAPTER = 'BULL_BOARD_ADAPTER';
export const GENERATION_QUEUE = 'generation';
export const CRAWL_QUEUE = 'crawl';
export const PLAIN_SCRAPE_QUEUE = 'plain-scrape';
export const BROWSER_AGENT_QUEUE = 'browser-agent';
export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';
export const AI_BATCH_QUEUE = 'ai-batch';

export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 5;
export const WEBHOOK_DELIVERY_BACKOFF_MS = 5_000;
export const WEBHOOK_DELIVERY_CONCURRENCY = 10;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;

// OpenAI's batch completion window is 24h; this is a safety margin past that before we give up
// polling and fail the run outright (see AiBatchPollCron).
export const AI_BATCH_TIMEOUT_MS = 26 * 60 * 60_000;
