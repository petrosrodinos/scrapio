import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostCategory } from 'generated/prisma';

export class CostEntryItem {
  @ApiProperty({
    description: 'Cost entry id',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  id: string;

  @ApiProperty({
    enum: CostCategory,
    description: 'Cost category',
    example: CostCategory.STRUCTURED_EXTRACTION,
  })
  category: CostCategory;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Provider that incurred the cost',
    example: 'openai',
  })
  provider: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Model used',
    example: 'gpt-4o',
  })
  model: string | null;

  @ApiProperty({ description: 'Cost amount', example: 0.0234 })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Workflow run this cost was incurred for, if any',
    example: 'd6a4f5e7-8c9b-4a0d-1e2f-3b4c5d6e7f8a',
  })
  workflow_run_id: string | null;

  @ApiProperty({
    description: 'When the cost was recorded',
    example: '2026-08-17T09:32:31.000Z',
  })
  created_at: Date;
}

export class CostSummaryByCategoryEntity {
  @ApiProperty({
    enum: CostCategory,
    description: 'Cost category',
    example: CostCategory.STRUCTURED_EXTRACTION,
  })
  category: CostCategory;

  @ApiProperty({
    description: 'Total cost for this category',
    example: 12.3456,
  })
  total_cost: number;

  @ApiProperty({
    description: 'Number of cost entries in this category',
    example: 42,
  })
  entries_count: number;
}

export class CostSummaryEntity {
  @ApiProperty({
    description: 'Total cost across all categories',
    example: 15.6789,
  })
  total_cost: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency: string;

  @ApiProperty({ type: [CostSummaryByCategoryEntity] })
  by_category: CostSummaryByCategoryEntity[];
}
