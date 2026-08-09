import { ApiProperty } from '@nestjs/swagger';
import { ComputerUseModel, IntegrationType } from 'generated/prisma';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  integrationRequiresAiModel,
  integrationRequiresComputerUseModel,
} from '@/shared/config/integrations/integrations.config';

export class ConnectUserIntegrationDto {
  @ApiProperty({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  integration_type: IntegrationType;

  @ApiProperty({ example: 'sk-ant-...' })
  @IsString()
  @MinLength(1)
  api_key: string;

  @ApiProperty({ enum: ComputerUseModel, required: false })
  @ValidateIf((dto: ConnectUserIntegrationDto) =>
    integrationRequiresComputerUseModel(dto.integration_type),
  )
  @IsEnum(ComputerUseModel)
  computer_use_model?: ComputerUseModel;

  @ApiProperty({ enum: ComputerUseModel, required: false })
  @ValidateIf((dto: ConnectUserIntegrationDto) =>
    integrationRequiresAiModel(dto.integration_type),
  )
  @IsEnum(ComputerUseModel)
  ai_model?: ComputerUseModel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
