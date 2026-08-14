import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteBrowserAgentConfigsDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    description: 'IDs of the browser agent configs to delete',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  workflow_config_ids: string[];
}
