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
  @ApiProperty({ enum: IntegrationType, description: 'Which integration to connect', example: IntegrationType.ANTHROPIC })
  @IsEnum(IntegrationType)
  integration_type: IntegrationType;

  @ApiProperty({ description: 'API key credential for the integration', example: 'sk-ant-...' })
  @IsString()
  @MinLength(1)
  api_key: string;

  @ApiProperty({
    enum: ComputerUseModel,
    required: false,
    description: 'Computer-use model to use. Required if the integration type supports computer use.',
    example: ComputerUseModel.CLAUDE_SONNET_4_6,
  })
  @ValidateIf((dto: ConnectUserIntegrationDto) =>
    integrationRequiresComputerUseModel(dto.integration_type),
  )
  @IsEnum(ComputerUseModel)
  computer_use_model?: ComputerUseModel;

  @ApiProperty({
    enum: ComputerUseModel,
    required: false,
    description: 'AI model to use. Required if the integration type supports AI models.',
    example: ComputerUseModel.GPT_4O,
  })
  @ValidateIf((dto: ConnectUserIntegrationDto) =>
    integrationRequiresAiModel(dto.integration_type),
  )
  @IsEnum(ComputerUseModel)
  ai_model?: ComputerUseModel;

  @ApiProperty({
    required: false,
    description:
      'Set as the default AI integration for the user. Only allowed for AI integrations with an ai_model set. If omitted, becomes the default automatically when the user has no other default AI integration.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({
    required: false,
    description: 'Arbitrary additional metadata to store alongside the integration',
    example: { region: 'us-east-1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
