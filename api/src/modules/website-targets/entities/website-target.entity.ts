import { ApiProperty } from '@nestjs/swagger';
import { BlockRuleSource, BlockSignal } from 'generated/prisma';

class BlockRuleEntity {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  website_target_id: string;

  @ApiProperty({
    nullable: true,
    description: 'Human-readable name shown in the admin UI',
    example: 'CloudFront token challenge',
  })
  label: string | null;

  @ApiProperty({
    enum: BlockSignal,
    example: BlockSignal.CHALLENGE,
    description:
      'BLOCKED = stop immediately (hard error page). CHALLENGE = keep waiting for the page to clear itself.',
  })
  signal: BlockSignal;

  @ApiProperty({
    enum: BlockRuleSource,
    example: BlockRuleSource.PATH,
    description: 'Which part of the page `pattern` is tested against',
  })
  source: BlockRuleSource;

  @ApiProperty({
    description:
      'Substring (or regex source when is_regex is set) to match against `source`. CSS selector when source = SELECTOR.',
    example: '/challenge',
  })
  pattern: string;

  @ApiProperty({
    description: 'Treat `pattern` as a regular expression instead of a plain substring',
    example: false,
  })
  is_regex: boolean;

  @ApiProperty({
    nullable: true,
    description: 'Regex flags, used only when is_regex is true',
    example: 'i',
  })
  regex_flags: string | null;

  @ApiProperty({ description: 'Evaluation order (0-indexed)', example: 0 })
  position: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class WebsiteTarget {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({
    description: 'Owning user id',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  user_id: string;

  @ApiProperty({ example: 'Example Store' })
  name: string;

  @ApiProperty({
    description: 'Root URL of the target website',
    example: 'https://example.com',
  })
  base_url: string;

  @ApiProperty({
    nullable: true,
    description: 'Free-form notes about this target',
    example: 'Primary storefront, checked nightly',
  })
  notes: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Timestamp of the last successful crawl against this target',
  })
  last_success_at: Date | null;

  @ApiProperty({
    nullable: true,
    description: 'Timestamp of the last failed crawl against this target',
  })
  last_failure_at: Date | null;

  @ApiProperty({
    nullable: true,
    description: 'Error message from the last failed crawl',
    example: 'Timed out waiting for page to become ready',
  })
  last_error_message: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Arbitrary metadata captured for this target',
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    nullable: true,
    description:
      'Override for the default page-ready wait budget used by block/challenge checks (ms)',
    example: 15000,
  })
  block_handling_wait_timeout_ms: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Override for the page-ready body-length heuristic (characters)',
    example: 500,
  })
  block_handling_min_ready_body_length: number | null;

  @ApiProperty({
    required: false,
    type: () => [BlockRuleEntity],
    description:
      'Extra bot-block/challenge detection rules for this target. Present on GET /website-targets/:id',
  })
  block_rules?: BlockRuleEntity[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({
    required: false,
    description: 'Related record counts. Present on GET /website-targets/:id',
    example: { workflow_configs: 3, workflow_runs: 128, notifications: 0 },
  })
  _count?: {
    workflow_configs: number;
    workflow_runs: number;
    notifications: number;
  };
}
