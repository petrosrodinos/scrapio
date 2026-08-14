import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Display name for the key', example: 'CI pipeline' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    required: false,
    description: 'ISO 8601 date/time when the key should stop working. Must be in the future. Omit for a key that never expires.',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}
