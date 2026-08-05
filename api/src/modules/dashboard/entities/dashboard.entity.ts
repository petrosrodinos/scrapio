import { ApiProperty } from '@nestjs/swagger';

export class DashboardActivityItem {
  @ApiProperty({
    enum: ['crawl', 'crawl_failed', 'scraper_broken', 'generation'],
  })
  type: 'crawl' | 'crawl_failed' | 'scraper_broken' | 'generation';

  @ApiProperty()
  id: string;

  @ApiProperty()
  website_target_id: string;

  @ApiProperty({ nullable: true })
  website_target_name: string | null;

  @ApiProperty({ nullable: true, required: false })
  scraper_id?: string | null;

  @ApiProperty({ nullable: true, required: false })
  crawl_run_id?: string | null;

  @ApiProperty({ nullable: true, required: false })
  generation_run_id?: string | null;

  @ApiProperty({ nullable: true, required: false })
  message?: string | null;

  @ApiProperty()
  occurred_at: Date;
}

export class Dashboard {
  @ApiProperty()
  scrapers_total: number;

  @ApiProperty()
  scrapers_active: number;

  @ApiProperty()
  scrapers_broken: number;

  @ApiProperty()
  targets_total: number;

  @ApiProperty()
  running_crawls: number;

  @ApiProperty()
  failed_crawls_24h: number;

  @ApiProperty({ nullable: true })
  last_crawl_at: Date | null;

  @ApiProperty()
  queue_waiting: number;

  @ApiProperty()
  queue_active: number;

  @ApiProperty()
  queue_failed: number;

  @ApiProperty()
  active_generation_runs: number;

  @ApiProperty()
  extracted_items_total: number;

  @ApiProperty({ type: [DashboardActivityItem] })
  activity_feed: DashboardActivityItem[];
}
