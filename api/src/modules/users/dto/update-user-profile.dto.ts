import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Europe/Athens' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  default_schedule_tz?: string;
}
