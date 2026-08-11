import { ApiProperty } from '@nestjs/swagger';
import {
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
import { OutputFormat } from 'generated/prisma';

export class UpdateBrowserAgentConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

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
    (dto: UpdateBrowserAgentConfigDto) =>
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
