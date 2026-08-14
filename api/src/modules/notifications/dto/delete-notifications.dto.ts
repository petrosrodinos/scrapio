import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteNotificationsDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    description: 'IDs of the notifications to delete',
    example: ['b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d', 'c4a2f3b1-2345-4b6c-8d7e-9f0a1b2c3d4e'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}
