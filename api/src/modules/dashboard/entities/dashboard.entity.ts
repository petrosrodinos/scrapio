import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardActivityItem {
  @ApiProperty({
    enum: ['crawl', 'crawl_failed', 'scraper_broken', 'generation'],
    description: 'Kind of event this activity feed entry represents',
    example: 'crawl',
  })
  type: 'crawl' | 'crawl_failed' | 'scraper_broken' | 'generation';

  @ApiProperty({
    description:
      'Id of the underlying record (crawl run id for crawl/crawl_failed, scraper id for scraper_broken, generation run id for generation)',
    example: 'a3f1c2d4-5b6e-4f7a-8c9d-0e1f2a3b4c5d',
  })
  id: string;

  @ApiProperty({
    nullable: true,
    description: 'Website target this event relates to, if any',
    example: 'b4e2d3c5-6a7f-4e8b-9d0c-1f2e3a4b5c6d',
  })
  website_target_id: string | null;

  @ApiProperty({
    description:
      "Website target's display name, or an empty string if it could not be resolved",
    example: 'Google Maps - Restaurants NYC',
  })
  website_target_name: string;

  @ApiProperty({
    nullable: true,
    description: 'Scraper (workflow config) this event relates to, if any',
    example: 'c5f3e4d6-7b8a-4f9c-0e1d-2a3b4c5d6e7f',
  })
  workflow_config_id: string | null;

  @ApiPropertyOptional({
    description:
      'Crawl run id — present only for type "crawl" and "crawl_failed"',
    example: 'd6a4f5e7-8c9b-4a0d-1e2f-3b4c5d6e7f8a',
  })
  workflow_run_id?: string;

  @ApiPropertyOptional({
    description: 'Generation run id — present only for type "generation"',
    example: 'e7b5a6f8-9d0c-4b1e-2f3a-4c5d6e7f8a9b',
  })
  generation_run_id?: string;

  @ApiProperty({
    nullable: true,
    description: 'Human-readable summary of the event',
    example: 'Run completed',
  })
  message: string | null;

  @ApiProperty({
    description: 'When the event occurred',
    example: '2026-08-14T09:30:00.000Z',
  })
  occurred_at: Date;
}

export class Dashboard {
  @ApiProperty({ description: 'Total number of scrapers in scope', example: 12 })
  scrapers_total: number;

  @ApiProperty({ description: 'Number of scrapers with status ACTIVE', example: 9 })
  scrapers_active: number;

  @ApiProperty({ description: 'Number of scrapers with status BROKEN', example: 1 })
  scrapers_broken: number;

  @ApiProperty({ description: 'Total number of website targets in scope', example: 15 })
  targets_total: number;

  @ApiProperty({
    description: 'Number of crawl runs currently QUEUED or RUNNING',
    example: 2,
  })
  running_crawls: number;

  @ApiProperty({
    description: 'Number of crawl runs that FAILED in the last 24 hours',
    example: 3,
  })
  failed_crawls_24h: number;

  @ApiProperty({
    nullable: true,
    description: 'Timestamp of the most recently finished crawl run, if any',
    example: '2026-08-14T08:15:00.000Z',
  })
  last_crawl_at: Date | null;

  @ApiProperty({ description: 'Number of queued (WAITING) job log entries', example: 4 })
  queue_waiting: number;

  @ApiProperty({ description: 'Number of ACTIVE job log entries', example: 1 })
  queue_active: number;

  @ApiProperty({ description: 'Number of FAILED job log entries', example: 0 })
  queue_failed: number;

  @ApiProperty({
    description:
      'Number of scraper generation runs currently QUEUED, RUNNING, or AWAITING_REVIEW',
    example: 1,
  })
  active_generation_runs: number;

  @ApiProperty({
    description: 'Total number of extracted items in scope',
    example: 5342,
  })
  extracted_items_total: number;

  @ApiProperty({
    type: [DashboardActivityItem],
    description:
      'Most recent activity across crawls, crawl failures, broken scrapers, and generation runs (newest first, capped at 20 items)',
  })
  activity_feed: DashboardActivityItem[];
}
