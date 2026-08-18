import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import {
  OutputSchemaDefinition,
  RegexPresets,
} from '../interfaces/output-schema.interface';

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
    required: false,
    enum: OutputFormat,
    isArray: true,
    description:
      'Output formats the generated scraper should produce (STRUCTURED_JSON, MARKDOWN, or both). Omit or pass an empty array when generating Playwright config only.',
    example: [OutputFormat.STRUCTURED_JSON],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OutputFormat, { each: true })
  output_formats?: OutputFormat[];

  @ApiProperty({
    required: false,
    additionalProperties: true,
    description:
      `App-level output schema definition. Required when STRUCTURED_JSON is included in output_formats. Each field maps to a primitive type ("string", "number", "integer", "boolean", or their "[]" array forms), a string/number enum (["a", "b"] / [1, 2]), a nested object ({ ... }), an object array ([{ ... }]), or a rich descriptor ({ type, description?, required?, nullable?, enum?, pattern?, flags?, minimum?, maximum?, minLength?, maxLength?, items?, properties? }). For "regex"-typed fields, "pattern" accepts a built-in preset name (${Object.values(RegexPresets).join(', ')}) or a raw regex source string.`,
    example: {
      title: 'string',
      price: 'number',
      status: ['for_sale', 'sold', 'pending'],
      rating: [1, 2, 3, 4, 5],
      features: 'string[]',
      email: { type: 'regex', pattern: RegexPresets.EMAIL },
      phone: { type: 'regex', pattern: RegexPresets.PHONE },
      listing_url: { type: 'regex', pattern: RegexPresets.URL },
    },
  })
  @ValidateIf((dto) => dto.output_formats?.includes(OutputFormat.STRUCTURED_JSON))
  @IsObject()
  output_schema?: OutputSchemaDefinition;

  @ApiProperty({
    description:
      'When true, queue the generation job immediately. When false, save as DRAFT without starting.',
    default: false,
  })
  @IsBoolean()
  start: boolean;
}
