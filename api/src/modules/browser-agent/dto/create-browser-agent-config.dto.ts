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
  IsUrl,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OutputFormat } from 'generated/prisma';

export class CreateBrowserAgentConfigDto {
  @ApiProperty({
    description: 'Browser agent config display name',
    example: 'Acme checkout flow agent',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Optional extra instructions to guide the browsing agent',
    example: 'Add the first product to the cart and extract the total price',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    description: 'Website URL the agent should explore',
    example: 'https://example.com',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Hard cap on computer-use steps for runs of this config',
    default: 25,
    minimum: 1,
    example: 25,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_steps: number;

  @ApiProperty({
    type: [String],
    enum: OutputFormat,
    required: false,
    default: [],
    description:
      'STRUCTURED_JSON and/or MARKDOWN. At least one is required for a browser agent run.',
  })
  @IsArray()
  @IsEnum(OutputFormat, { each: true })
  output_formats: OutputFormat[];

  @ApiProperty({
    required: false,
    description:
      'Required when output_formats includes STRUCTURED_JSON. Field-name to type-descriptor map.',
    example: { title: 'string', price: 'number' },
  })
  @ValidateIf(
    (dto: CreateBrowserAgentConfigDto) =>
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

  @ApiProperty({
    required: false,
    default: true,
    description:
      "Scrape-and-forget mode: set false to delete each run's result payload once a subscribed " +
      'webhook endpoint confirms delivery, instead of keeping it. Requires an active webhook ' +
      'endpoint subscribed to a run-finished event.',
  })
  @IsOptional()
  @IsBoolean()
  persist_results?: boolean;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Submit STRUCTURED_JSON extraction as an OpenAI batch job instead of running it ' +
      'immediately. The run parks in AWAITING_AI_BATCH until the batch completes (up to 24h), ' +
      'and the completion webhook fires then instead of at scrape-completion time. Requires ' +
      'output_formats to include STRUCTURED_JSON with a linked schema, and an OpenAI ' +
      'integration — batching is not supported for other providers yet.',
  })
  @IsOptional()
  @IsBoolean()
  ai_batch_mode?: boolean;

  @ApiProperty({
    required: false,
    default: false,
    description:
      "When true, every HTTP request/response the agent's browser makes during the run is " +
      'recorded and, on completion, distilled into a downloadable OpenAPI spec.',
  })
  @IsOptional()
  @IsBoolean()
  capture_api?: boolean;
}
