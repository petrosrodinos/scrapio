import { ApiProperty } from '@nestjs/swagger';
import { IntegrationType } from 'generated/prisma';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class ConnectUserIntegrationDto {
  @ApiProperty({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  integration_type: IntegrationType;

  @ApiProperty({ example: 'sk-ant-...' })
  @IsString()
  @MinLength(1)
  api_key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
