import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI pipeline' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false, example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}
