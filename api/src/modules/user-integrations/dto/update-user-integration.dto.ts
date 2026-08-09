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
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  api_key?: string;

  @ApiProperty({ enum: ComputerUseModel, required: false })
  @IsOptional()
  @IsEnum(ComputerUseModel)
  computer_use_model?: ComputerUseModel;

  @ApiProperty({ enum: ComputerUseModel, required: false })
  @IsOptional()
  @IsEnum(ComputerUseModel)
  ai_model?: ComputerUseModel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
