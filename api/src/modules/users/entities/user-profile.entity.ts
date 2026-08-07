import { ApiProperty } from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';

export class UserProfile {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ enum: AuthRole })
  role: AuthRole;

  @ApiProperty({ example: 'Europe/Athens' })
  default_schedule_tz: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
