import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateScraperDto {
  @ApiProperty({ description: 'Website target this scraper belongs to' })
  @IsUUID()
  website_target_id: string;

  @ApiProperty({
    description: 'Scraper display name',
    example: 'Acme listing scraper',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Cron schedule for automatic crawls. Null/omit for manual-only runs.',
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
    description:
      'Initial scraper config (start_url, listing_selector, fields, pagination, ...). Omit to create the scraper without an initial version.',
    example: { start_url: 'https://acme-realestate.com/listings' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
