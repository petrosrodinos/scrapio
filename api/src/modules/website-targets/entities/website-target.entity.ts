import { ApiProperty } from '@nestjs/swagger';

export class WebsiteTarget {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  user_id: string;

  @ApiProperty({ example: 'Example Store' })
  name: string;

  @ApiProperty({ example: 'https://example.com' })
  base_url: string;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty({ nullable: true })
  last_success_at: Date | null;

  @ApiProperty({ nullable: true })
  last_failure_at: Date | null;

  @ApiProperty({ nullable: true })
  last_error_message: string | null;

  @ApiProperty({ nullable: true })
  block_handling_wait_timeout_ms: number | null;

  @ApiProperty({ nullable: true })
  block_handling_min_ready_body_length: number | null;

  @ApiProperty({
    required: false,
    description: 'Present on GET /admin/website-targets/:id',
    type: 'array',
  })
  block_rules?: Array<{
    id: string;
    label: string | null;
    signal: string;
    source: string;
    pattern: string;
    is_regex: boolean;
    regex_flags: string | null;
    position: number;
  }>;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    description: 'Present on GET /admin/website-targets/:id',
    example: { workflow_configs: 0, workflow_runs: 0, notifications: 0 },
  })
  _count?: {
    workflow_configs: number;
    workflow_runs: number;
    notifications: number;
  };
}
