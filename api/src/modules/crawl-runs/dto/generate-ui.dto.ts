import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateUiDto {
  @ApiProperty({
    required: false,
    description: 'Optional extra guidance for how the AI should render the interface',
  })
  @IsOptional()
  @IsString()
  instructions?: string;
}
