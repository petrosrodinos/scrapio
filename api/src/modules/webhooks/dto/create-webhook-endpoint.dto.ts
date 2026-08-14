import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WebhookEventType } from 'generated/prisma';

export class CreateWebhookEndpointDto {
  @ApiProperty({ required: false, example: 'Production pipeline' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'https://example.com/webhooks/scrapio' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;

  @ApiProperty({
    description: 'Secret you choose, used to HMAC-sign outgoing payloads so you can verify they came from us',
    minLength: 16,
    example: 'whsec_9f8e7d6c5b4a3928170f1e2d3c4b5a69',
  })
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  secret: string;

  @ApiProperty({
    type: [String],
    enum: WebhookEventType,
    description: 'Which events this endpoint should receive',
    minItems: 1,
    example: [WebhookEventType.WORKFLOW_RUN_SUCCEEDED, WebhookEventType.WORKFLOW_RUN_FAILED],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(WebhookEventType, { each: true })
  subscribed_events: WebhookEventType[];
}
