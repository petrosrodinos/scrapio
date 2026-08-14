import { ApiProperty } from '@nestjs/swagger';
import {
  DiagnosticsMode,
  ScraperStatus,
  ScraperHealth,
} from 'generated/prisma';
import { ScraperVersion } from './scraper-version.entity';

export class Scraper {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  website_target_id: string;

  @ApiProperty({ example: 'Acme listing scraper' })
  name: string;

  @ApiProperty({ nullable: true })
  active_version_id: string | null;

  @ApiProperty({ example: 1 })
  version_count: number;

  @ApiProperty({ enum: ScraperStatus, example: ScraperStatus.TESTING })
  status: ScraperStatus;

  @ApiProperty()
  self_healing_enabled: boolean;

  @ApiProperty({
    enum: DiagnosticsMode,
    example: DiagnosticsMode.PRODUCTION,
    description: "Debugging depth for this scraper's crawl runs",
  })
  diagnostics_mode: DiagnosticsMode;

  @ApiProperty({ enum: ScraperHealth, example: ScraperHealth.GOOD, nullable: true })
  health: ScraperHealth | null;

  @ApiProperty({ nullable: true })
  success_rate: number | null;

  @ApiProperty({ nullable: true })
  avg_runtime_ms: number | null;

  @ApiProperty()
  consecutive_failures: number;

  @ApiProperty({
    nullable: true,
    description: 'Cron expression when scheduled; null means manual only',
    example: '0 */6 * * *',
  })
  schedule_cron: string | null;

  @ApiProperty({ nullable: true })
  schedule_timezone: string | null;

  @ApiProperty({
    description: 'Whether the cron schedule is active',
    example: false,
  })
  schedule_enabled: boolean;

  @ApiProperty({
    default: true,
    description:
      'When false ("scrape and forget"), each run\'s result payload is deleted once a subscribed webhook endpoint confirms delivery.',
  })
  persist_results: boolean;

  @ApiProperty({ nullable: true })
  last_success_at: Date | null;

  @ApiProperty({ nullable: true })
  last_failure_at: Date | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    type: ScraperVersion,
    description: 'Present on GET /scrapers/:id',
  })
  active_version?: ScraperVersion | null;

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme Real Estate' },
  })
  website_target?: { name: string };
}
