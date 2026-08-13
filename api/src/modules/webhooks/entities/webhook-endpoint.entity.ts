import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from 'generated/prisma';

export class WebhookEndpointEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: [String], enum: WebhookEventType })
  subscribed_events: WebhookEventType[];

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ nullable: true })
  last_triggered_at: Date | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
