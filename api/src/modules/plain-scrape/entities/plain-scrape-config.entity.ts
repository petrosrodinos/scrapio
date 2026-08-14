import { ApiProperty } from '@nestjs/swagger';
import { ExtractionScope, OutputFormat, WorkflowType } from 'generated/prisma';

export class PlainScrapeConfig {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: WorkflowType, example: WorkflowType.PLAIN_SCRAPE })
  type: WorkflowType;

  @ApiProperty({ example: 'Acme sitemap plain scrape' })
  name: string;

  @ApiProperty({ nullable: true, required: false })
  description: string | null;

  @ApiProperty({ type: [String], example: ['https://example.com/page-1', 'https://example.com/page-2'] })
  urls: string[];

  @ApiProperty({
    enum: ExtractionScope,
    example: ExtractionScope.COMBINED,
    description: 'How multiple URLs are normalized into output',
  })
  extraction_scope: ExtractionScope;

  @ApiProperty({
    enum: OutputFormat,
    isArray: true,
    example: [OutputFormat.STRUCTURED_JSON],
    description: 'Output formats this config produces',
  })
  output_formats: OutputFormat[];

  @ApiProperty({ nullable: true, description: 'Active extraction schema version id, when output includes STRUCTURED_JSON' })
  extraction_schema_version_id: string | null;

  @ApiProperty({ nullable: true, example: '0 * * * *', description: 'Cron expression for scheduled runs' })
  schedule_cron: string | null;

  @ApiProperty({ nullable: true, example: 'Europe/Athens' })
  schedule_timezone: string | null;

  @ApiProperty()
  schedule_enabled: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    description: 'Present on the get-one response',
    example: { id: '123e4567-e89b-12d3-a456-426614174000', version: 3, definition: {} },
  })
  extraction_schema_version?: { id: string; version: number; definition: unknown } | null;
}
