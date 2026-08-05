import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
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
    description:
      'Initial scraper config (start_url, listing_selector, fields, pagination, ...). Omit to create the scraper without an initial version.',
    example: { start_url: 'https://acme-realestate.com/listings' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
