import { ApiProperty } from '@nestjs/swagger';
import { RunStatus, WorkflowType } from 'generated/prisma';

export class WorkflowRun {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: WorkflowType })
  type: WorkflowType;

  @ApiProperty()
  workflow_config_id: string;

  @ApiProperty({ nullable: true })
  website_target_id: string | null;

  @ApiProperty({ nullable: true })
  scraper_version_id: string | null;

  @ApiProperty({ nullable: true })
  url: string | null;

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
}

export { WorkflowRun as CrawlRun };
