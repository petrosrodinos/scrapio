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
  @ApiProperty({ required: false, description: 'Display name for the endpoint', example: 'Production pipeline' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    required: false,
    description: 'URL to deliver events to',
    example: 'https://example.com/webhooks/scrapio',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;

  @ApiProperty({
    required: false,
    description: 'Rotate the signing secret. Omit to keep the current one.',
    minLength: 16,
    example: 'whsec_9f8e7d6c5b4a3928170f1e2d3c4b5a69',
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  secret?: string;

  @ApiProperty({
    type: [String],
    enum: WebhookEventType,
    required: false,
    minItems: 1,
    description: 'Which events this endpoint should receive. Replaces the current subscription list.',
    example: [WebhookEventType.WORKFLOW_RUN_SUCCEEDED, WebhookEventType.WORKFLOW_RUN_FAILED],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  subscribed_events?: WebhookEventType[];

  @ApiProperty({
    required: false,
    description: 'Enable or disable delivery without deleting the endpoint',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
