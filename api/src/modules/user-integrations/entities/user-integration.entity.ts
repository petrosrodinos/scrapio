import { ApiProperty } from '@nestjs/swagger';
import { ComputerUseModel, IntegrationType } from 'generated/prisma';

export class UserIntegration {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: IntegrationType })
  integration_type: IntegrationType;

  @ApiProperty({ enum: ComputerUseModel, nullable: true })
  computer_use_model: ComputerUseModel | null;

  @ApiProperty({ enum: ComputerUseModel, nullable: true })
  ai_model: ComputerUseModel | null;

  @ApiProperty({ example: 'sk-...xxxx' })
  api_key_masked: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
