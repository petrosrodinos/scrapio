import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WebhookEventType } from 'generated/prisma';

export class SendTestEventDto {
  @ApiProperty({
    enum: WebhookEventType,
    description: 'Which event type to simulate. A sample payload for this type is delivered to the endpoint.',
    example: WebhookEventType.WORKFLOW_RUN_SUCCEEDED,
  })
  @IsEnum(WebhookEventType)
  event_type: WebhookEventType;
}
