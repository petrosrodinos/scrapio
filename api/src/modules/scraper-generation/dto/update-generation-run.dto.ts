import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OutputFormat } from 'generated/prisma';

export class UpdateGenerationRunDto {
  @ApiProperty({
    required: false,
    description: 'Goal/instructions given to the model',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  prompt?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Hard cap on computer-use steps. Null clears the limit. Omit to leave unchanged.',
    minimum: 1,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_steps?: number | null;

  @ApiProperty({
    required: false,
    enum: OutputFormat,
    isArray: true,
    description: 'Output formats the generated scraper should produce',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(OutputFormat, { each: true })
  output_formats?: OutputFormat[];

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'App-level output schema definition. Required when STRUCTURED_JSON is selected.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  output_schema?: Record<string, unknown> | null;

  @ApiProperty({
    required: false,
    description:
      'Staged scraper config pending review. Only allowed when status is AWAITING_REVIEW.',
  })
  @IsOptional()
  @IsObject()
  staged_config?: Record<string, unknown>;
}
