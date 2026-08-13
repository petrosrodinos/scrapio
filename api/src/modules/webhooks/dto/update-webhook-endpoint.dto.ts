import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WebhookEventType } from 'generated/prisma';

export class UpdateWebhookEndpointDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @ApiProperty({
    required: false,
    description: 'Rotate the signing secret. Omit to keep the current one.',
    minLength: 16,
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  secret?: string;

  @ApiProperty({ type: [String], enum: WebhookEventType, required: false, minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  subscribed_events?: WebhookEventType[];

  @ApiProperty({ required: false, description: 'Enable or disable delivery without deleting the endpoint' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
