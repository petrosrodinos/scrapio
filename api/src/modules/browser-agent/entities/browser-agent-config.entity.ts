import { ApiProperty } from '@nestjs/swagger';
import { OutputFormat, WorkflowType } from 'generated/prisma';

export class BrowserAgentConfig {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: WorkflowType, example: WorkflowType.BROWSER_AGENT })
  type: WorkflowType;

  @ApiProperty({ example: 'Acme listing browser agent' })
  name: string;

  @ApiProperty({ nullable: true, required: false })
  description: string | null;

  @ApiProperty({ example: 'https://example.com' })
  url: string;

  @ApiProperty({ nullable: true, example: 25, description: 'Max computer-use steps before the run is stopped' })
  max_steps: number | null;

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

  @ApiProperty({
    default: true,
    description:
      'When false ("scrape and forget"), each run\'s result payload is deleted once a subscribed webhook endpoint confirms delivery.',
  })
  persist_results: boolean;

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
