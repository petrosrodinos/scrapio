export const BULL_BOARD_ADAPTER = 'BULL_BOARD_ADAPTER';
export const GENERATION_QUEUE = 'generation';
export const CRAWL_QUEUE = 'crawl';
export const PLAIN_SCRAPE_QUEUE = 'plain-scrape';
export const BROWSER_AGENT_QUEUE = 'browser-agent';
export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

export const WEBHOOK_DELIVERY_MAX_ATTEMPTS = 5;
export const WEBHOOK_DELIVERY_BACKOFF_MS = 5_000;
export const WEBHOOK_DELIVERY_CONCURRENCY = 10;
export const WEBHOOK_DELIVERY_TIMEOUT_MS = 10_000;
