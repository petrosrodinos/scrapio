import { ApiProperty } from '@nestjs/swagger';
import { CrawlRunStatus } from 'generated/prisma';

export class CrawlRun {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  website_target_id: string;

  @ApiProperty({ nullable: true })
  scraper_id: string | null;

  @ApiProperty({ enum: CrawlRunStatus, example: CrawlRunStatus.QUEUED })
  status: CrawlRunStatus;

  @ApiProperty({ nullable: true })
  started_at: Date | null;

  @ApiProperty({ nullable: true })
  finished_at: Date | null;

  @ApiProperty({ nullable: true })
  duration_ms: number | null;

  @ApiProperty()
  total_found: number;

  @ApiProperty({
    description: 'Of total_found, how many were brand-new listings this scrape',
  })
  total_new_listings: number;

  @ApiProperty({
    description:
      'Of total_found, how many were already-known listings re-seen this scrape',
  })
  total_refreshed_listings: number;

  @ApiProperty({ nullable: true })
  error_message: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
