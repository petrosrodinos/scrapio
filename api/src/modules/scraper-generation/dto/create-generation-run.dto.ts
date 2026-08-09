import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OutputFormat } from 'generated/prisma';

export class CreateGenerationRunDto {
  @ApiProperty({ description: 'Website target to generate/fix a scraper for' })
  @IsUUID()
  website_target_id: string;

  @ApiProperty({
    required: false,
    description: 'Set when this run is fixing/updating an existing scraper',
  })
  @IsOptional()
  @IsUUID()
  scraper_id?: string;

  @ApiProperty({
    description: 'Goal/instructions given to the model',
  })
  @IsString()
  @MinLength(1)
  prompt: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Hard cap on computer-use steps for this run. Omit or null for no limit.',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_steps?: number;

  @ApiProperty({
    enum: OutputFormat,
    isArray: true,
    description:
      'Output formats the generated scraper should produce (STRUCTURED_JSON, MARKDOWN, or both)',
    example: [OutputFormat.STRUCTURED_JSON],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(OutputFormat, { each: true })
  output_formats: OutputFormat[];

  @ApiProperty({
    required: false,
    description:
      'App-level output schema definition. Required when STRUCTURED_JSON is included in output_formats.',
    example: {
      title: 'string',
      price: 'number',
      status: ['for_sale', 'sold', 'pending'],
      rating: [1, 2, 3, 4, 5],
      features: 'string[]',
    },
  })
  @ValidateIf((dto) => dto.output_formats?.includes(OutputFormat.STRUCTURED_JSON))
  @IsObject()
  output_schema?: Record<string, unknown>;

  @ApiProperty({
    description:
      'When true, queue the generation job immediately. When false, save as DRAFT without starting.',
    default: false,
  })
  @IsBoolean()
  start: boolean;
}
