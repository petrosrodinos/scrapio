import { ApiProperty } from '@nestjs/swagger';
import {
  GenerationRunStatus,
  GenerationTrigger,
  OutputFormat,
} from 'generated/prisma';
import { ComputerUseStep } from './computer-use-step.entity';

export class ScraperGenerationRun {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty()
  website_target_id: string;

  @ApiProperty({
    nullable: true,
    description: 'Set when this run is fixing/updating an existing scraper',
  })
  workflow_config_id: string | null;

  @ApiProperty({ enum: GenerationTrigger, example: GenerationTrigger.MANUAL })
  trigger: GenerationTrigger;

  @ApiProperty({
    enum: GenerationRunStatus,
    example: GenerationRunStatus.QUEUED,
  })
  status: GenerationRunStatus;

  @ApiProperty({ nullable: true })
  prompt: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Hard cap on computer-use steps for this run. Null means no limit.',
    example: 15,
  })
  max_steps: number | null;

  @ApiProperty({
    enum: OutputFormat,
    isArray: true,
    description:
      'Output formats the generated scraper should produce',
    example: [OutputFormat.STRUCTURED_JSON],
  })
  output_formats: OutputFormat[];

  @ApiProperty({
    nullable: true,
    description:
      'App-level output schema definition this run was generated against. Dynamic/polymorphic JSON shape (see CreateGenerationRunDto.output_schema); only present when STRUCTURED_JSON is included in output_formats.',
    example: { title: 'string', price: 'number' },
  })
  output_schema: Record<string, unknown> | null;

  @ApiProperty({
    nullable: true,
    description: 'Draft config produced by the model, pending review',
  })
  staged_config: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  produced_version_id: string | null;

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
    type: [ComputerUseStep],
    description:
      'Present on GET /generation-runs/:id, ordered by step_index asc',
  })
  steps?: ComputerUseStep[];

  @ApiProperty({
    required: false,
    description: 'Present on list/detail views',
    example: { name: 'Acme Real Estate' },
  })
  website_target?: { name: string };

  @ApiProperty({
    required: false,
    description:
      'Present on list/detail views when workflow_config_id is set',
    example: { name: 'Acme listing scraper' },
  })
  workflow_config?: { name: string } | null;
}
