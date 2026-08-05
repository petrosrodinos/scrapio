import { ApiProperty } from '@nestjs/swagger';
import { IntegrationType } from 'generated/prisma';

export class UserIntegration {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: IntegrationType })
  integration_type: IntegrationType;

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
