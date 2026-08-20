import { ApiProperty } from '@nestjs/swagger';
import { ComputerUseModel, IntegrationType } from 'generated/prisma';

export class UserIntegration {
  @ApiProperty({ description: 'User integration ID', example: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d' })
  id: string;

  @ApiProperty({ description: 'ID of the user this integration belongs to', example: '7c1e6b2a-4321-4f5e-8a9b-0c1d2e3f4a5b' })
  user_id: string;

  @ApiProperty({ enum: IntegrationType, description: 'Which integration this connects to' })
  integration_type: IntegrationType;

  @ApiProperty({ enum: ComputerUseModel, nullable: true, description: 'Configured computer-use model, if applicable' })
  computer_use_model: ComputerUseModel | null;

  @ApiProperty({ enum: ComputerUseModel, nullable: true, description: 'Configured AI model, if applicable' })
  ai_model: ComputerUseModel | null;

  @ApiProperty({ description: 'Masked API key. The raw credential is never returned after it is stored. Null when the stored credentials could not be decrypted.', nullable: true, example: 'sk-...xxxx' })
  api_key_masked: string | null;

  @ApiProperty({ description: 'True when the stored credentials could not be decrypted (e.g. after an encryption key rotation). Reconnect the integration to clear this.', example: false })
  credentials_invalid: boolean;

  @ApiProperty({ description: 'Whether the integration is currently enabled', example: true })
  is_active: boolean;

  @ApiProperty({ description: 'Whether this is the user\'s default AI integration', example: false })
  is_default: boolean;

  @ApiProperty({ description: 'Arbitrary additional metadata stored alongside the integration', nullable: true, example: { region: 'us-east-1' } })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'When the integration was connected', example: '2026-01-05T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'When the integration was last updated', example: '2026-01-05T12:00:00.000Z' })
  updated_at: Date;
}
