import { ApiProperty } from '@nestjs/swagger';
import {
  ExtractionScope,
  OutputFormat,
  RunStatus,
  RunTrigger,
  WorkflowType,
} from 'generated/prisma';

export class WorkflowRun {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: WorkflowType })
  type: WorkflowType;

  @ApiProperty()
  workflow_config_id: string;

  @ApiProperty({ enum: RunTrigger, example: RunTrigger.MANUAL })
  trigger: RunTrigger;

  @ApiProperty({ nullable: true })
  website_target_id: string | null;

  @ApiProperty({ nullable: true })
  scraper_version_id: string | null;

  @ApiProperty({ nullable: true, description: 'BROWSER_AGENT run target URL' })
  url: string | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run step cap',
    example: 25,
  })
  max_steps: number | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: URLs visited so far',
  })
  visited_urls: unknown | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: computer-use actions taken',
  })
  browser_actions: unknown | null;

  @ApiProperty({
    nullable: true,
    description: 'BROWSER_AGENT run: raw data collected during the run',
  })
  collected_data: unknown | null;

  @ApiProperty({
    type: [String],
    description: 'PLAIN_SCRAPE run: URLs to scrape',
  })
  urls: string[];

  @ApiProperty({
    enum: ExtractionScope,
    nullable: true,
    example: ExtractionScope.COMBINED,
    description: 'PLAIN_SCRAPE run: how multiple URLs are normalized',
  })
  extraction_scope: ExtractionScope | null;

  @ApiProperty({
    enum: OutputFormat,
    isArray: true,
    description:
      "Snapshot of the config's output contract (BROWSER_AGENT + PLAIN_SCRAPE)",
    example: [OutputFormat.STRUCTURED_JSON],
  })
  output_formats: OutputFormat[];

  @ApiProperty({ nullable: true })
  extraction_schema_version_id: string | null;

  @ApiProperty({ nullable: true, description: 'AI token/cost usage for this run' })
  ai_usage: unknown | null;

  @ApiProperty({ nullable: true, description: 'Free-form run metadata' })
  metadata: unknown | null;

  @ApiProperty({ enum: RunStatus, example: RunStatus.QUEUED })
  status: RunStatus;

  @ApiProperty({ nullable: true })
  error_message: string | null;

  @ApiProperty({ nullable: true })
  started_at: Date | null;

  @ApiProperty({ nullable: true })
  finished_at: Date | null;

  @ApiProperty({ nullable: true })
  duration_ms: number | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme Real Estate' },
  })
  website_target?: { name: string } | null;

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme listing scraper' },
  })
  workflow_config?: { name: string };
}

export { WorkflowRun as CrawlRun };
