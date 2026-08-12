import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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
  @ApiProperty({ description: 'Browser agent config display name' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Optional extra instructions to guide the browsing agent',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ description: 'Website URL the agent should explore' })
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
}
