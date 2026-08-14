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

export class CreatePlainScrapeConfigDto {
  @ApiProperty({
    description: 'Plain scrape config display name',
    example: 'Acme pricing pages',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Optional notes about this config',
    example: 'Nightly check of competitor pricing pages',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    type: [String],
    description: 'URLs to fetch as plain HTML',
    minItems: 1,
    maxItems: MAX_URLS_PER_CONFIG,
    example: ['https://example.com/pricing'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_URLS_PER_CONFIG)
  @IsUrl({}, { each: true })
  urls: string[];

  @ApiProperty({
    enum: ExtractionScope,
    required: false,
    default: ExtractionScope.COMBINED,
    description:
      'How multiple URLs are normalized when output_formats is non-empty: COMBINED merges all pages into one result, PER_URL produces one result per page.',
  })
  @IsOptional()
  @IsEnum(ExtractionScope)
  extraction_scope?: ExtractionScope;

  @ApiProperty({
    type: [String],
    enum: OutputFormat,
    required: false,
    default: [],
    description:
      'Leave empty to return raw HTML only (no AI). Include STRUCTURED_JSON and/or MARKDOWN to run the extraction pipeline.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OutputFormat, { each: true })
  output_formats?: OutputFormat[];

  @ApiProperty({
    required: false,
    description:
      'Required when output_formats includes STRUCTURED_JSON. Field-name to type-descriptor map.',
    example: { title: 'string', price: 'number' },
  })
  @ValidateIf(
    (dto: CreatePlainScrapeConfigDto) =>
      dto.output_formats?.includes(OutputFormat.STRUCTURED_JSON) ?? false,
  )
  @IsObject()
  output_schema?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Cron schedule for automatic runs. Null/omit for manual-only runs.',
    example: '0 */6 * * *',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @Matches(/^(\S+\s+){4}\S+$/, {
    message: 'schedule_cron must be a valid 5-field cron expression',
  })
  schedule_cron?: string | null;
}
