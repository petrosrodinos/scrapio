import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ExtractionScope, OutputFormat } from 'generated/prisma';

const MAX_URLS_PER_CONFIG = 200;

export class UpdatePlainScrapeConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    type: [String],
    required: false,
    minItems: 1,
    maxItems: MAX_URLS_PER_CONFIG,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_URLS_PER_CONFIG)
  @IsUrl({}, { each: true })
  urls?: string[];

  @ApiProperty({ enum: ExtractionScope, required: false })
  @IsOptional()
  @IsEnum(ExtractionScope)
  extraction_scope?: ExtractionScope;

  @ApiProperty({ type: [String], enum: OutputFormat, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(OutputFormat, { each: true })
  output_formats?: OutputFormat[];

  @ApiProperty({
    required: false,
    description: 'Required when output_formats includes STRUCTURED_JSON.',
  })
  @ValidateIf(
    (dto: UpdatePlainScrapeConfigDto) =>
      dto.output_formats?.includes(OutputFormat.STRUCTURED_JSON) ?? false,
  )
  @IsObject()
  output_schema?: Record<string, unknown>;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^(\S+\s+){4}\S+$/, {
    message: 'schedule_cron must be a valid 5-field cron expression',
  })
  schedule_cron?: string | null;
}
