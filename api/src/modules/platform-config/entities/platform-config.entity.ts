import { ApiProperty } from '@nestjs/swagger';

export class PlatformConfig {
  @ApiProperty({
    description: 'Singleton row id (always "singleton")',
    example: 'singleton',
  })
  id: string;

  @ApiProperty({
    nullable: true,
    description:
      'Max listing pages to paginate through per crawl. Null means the default value is used.',
    example: 50,
  })
  crawler_max_pages: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Timeout (ms) for page navigation/load. Null means the default value is used.',
    example: 30_000,
  })
  crawler_page_timeout_ms: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Timeout (ms) waiting for the listing selector to appear. Null means the default value is used.',
    example: 15_000,
  })
  crawler_selector_timeout_ms: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Pause (ms) between infinite-scroll/load-more steps. Null means the default value is used.',
    example: 1_500,
  })
  crawler_scroll_pause_ms: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Number of detail pages enriched concurrently. Null means the default value is used.',
    example: 3,
  })
  crawler_detail_concurrency: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Delay (ms) between detail-enrichment batches. Null means the default value is used.',
    example: 500,
  })
  crawler_detail_delay_ms: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Number of crawl jobs processed concurrently by the worker. Null means the default value is used.',
    example: 5,
  })
  crawler_worker_concurrency: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Timeout (ms) for a single crawl/enrichment job. Null means the default value is used.',
    example: 1_800_000,
  })
  crawler_job_timeout_ms: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Browser contexts created before recycling the shared Chromium instance. Null means the default value is used.',
    example: 250,
  })
  crawler_chromium_max_contexts_before_restart: number | null;

  @ApiProperty({
    description: 'When this config row was created',
    example: '2026-01-05T12:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When this config row was last updated',
    example: '2026-08-14T09:00:00.000Z',
  })
  updated_at: Date;
}
