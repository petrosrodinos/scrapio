import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'spio_AbCdEf…' })
  key_prefix: string;

  @ApiProperty({ nullable: true })
  last_used_at: Date | null;

  @ApiProperty({ nullable: true })
  expires_at: Date | null;

  @ApiProperty({ nullable: true })
  revoked_at: Date | null;

  @ApiProperty()
  created_at: Date;
}
