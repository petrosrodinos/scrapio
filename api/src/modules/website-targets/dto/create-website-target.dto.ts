import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BlockRuleDto } from './block-rule.dto';

export class CreateWebsiteTargetDto {
  @ApiProperty({
    description: 'Website target display name',
    example: 'Example Store',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Root URL of the target website',
    example: 'https://example.com',
  })
  @IsUrl()
  base_url: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    required: false,
    description:
      'Override for the default page-ready wait budget used by block/challenge checks (ms).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  block_handling_wait_timeout_ms?: number;

  @ApiProperty({
    required: false,
    description:
      'Override for the page-ready body-length heuristic (characters).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  block_handling_min_ready_body_length?: number;

  @ApiProperty({
    required: false,
    type: [BlockRuleDto],
    description: 'Extra bot-block/challenge detection rules for this target.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockRuleDto)
  block_rules?: BlockRuleDto[];
}
