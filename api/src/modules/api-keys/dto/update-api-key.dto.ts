import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateApiKeyDto {
  @ApiProperty({ required: false, description: 'New name for the API key', example: 'CI pipeline v2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Enable or disable the key without revoking it. A revoked key cannot be re-enabled.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
