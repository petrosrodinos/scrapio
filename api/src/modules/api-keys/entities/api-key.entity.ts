import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyEntity {
  @ApiProperty({ description: 'API key ID', example: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d' })
  id: string;

  @ApiProperty({ description: 'Display name for the key', example: 'CI pipeline' })
  name: string;

  @ApiProperty({
    description: 'First characters of the raw key, for identification only. The full key is never stored or returned again after creation.',
    example: 'spio_AbCdEf…',
  })
  key_prefix: string;

  @ApiProperty({ description: 'Whether the key can currently be used to authenticate', example: true })
  is_active: boolean;

  @ApiProperty({ description: 'When the key was last used to authenticate a request', nullable: true, example: '2026-08-10T09:15:00.000Z' })
  last_used_at: Date | null;

  @ApiProperty({ description: 'When the key stops being valid, if set', nullable: true, example: '2026-12-31T00:00:00.000Z' })
  expires_at: Date | null;

  @ApiProperty({ description: 'When the key was revoked, if it has been', nullable: true, example: null })
  revoked_at: Date | null;

  @ApiProperty({ description: 'When the key was created', example: '2026-01-05T12:00:00.000Z' })
  created_at: Date;
}
