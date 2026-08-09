import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Europe/Athens' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  default_schedule_tz?: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Default AI user integration id. Null clears the preference.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  default_ai_user_integration_id?: string | null;
}
