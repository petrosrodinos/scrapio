import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Europe/Athens' })
  @IsString()
  @MinLength(1)
  default_schedule_tz: string;
}
