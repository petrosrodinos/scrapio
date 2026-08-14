import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ComputerUseModel } from 'generated/prisma';

export class UpdateUserIntegrationDto {
  @ApiProperty({
    required: false,
    description: 'Replace the stored API key credential. Omit to keep the current one.',
    example: 'sk-ant-...',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  api_key?: string;

  @ApiProperty({
    enum: ComputerUseModel,
    required: false,
    description: 'Computer-use model to use. Must be valid for the integration type.',
    example: ComputerUseModel.CLAUDE_SONNET_4_6,
  })
  @IsOptional()
  @IsEnum(ComputerUseModel)
  computer_use_model?: ComputerUseModel;

  @ApiProperty({
    enum: ComputerUseModel,
    required: false,
    description: 'AI model to use. Must be valid for the integration type.',
    example: ComputerUseModel.GPT_4O,
  })
  @IsOptional()
  @IsEnum(ComputerUseModel)
  ai_model?: ComputerUseModel;

  @ApiProperty({ required: false, description: 'Enable or disable the integration', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    required: false,
    description: 'Set as the default AI integration for the user. Requires an ai_model to be set.',
    example: true,
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
