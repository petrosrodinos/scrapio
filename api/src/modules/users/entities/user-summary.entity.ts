import { ApiProperty } from '@nestjs/swagger';

export class UserSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;
}
