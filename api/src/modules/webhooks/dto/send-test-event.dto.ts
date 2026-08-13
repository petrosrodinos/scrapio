import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WebhookEventType } from 'generated/prisma';

export class SendTestEventDto {
  @ApiProperty({ enum: WebhookEventType })
  @IsEnum(WebhookEventType)
  event_type: WebhookEventType;
}
