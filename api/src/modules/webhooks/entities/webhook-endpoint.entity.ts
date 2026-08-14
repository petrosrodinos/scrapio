import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from 'generated/prisma';

export class WebhookEndpointEntity {
  @ApiProperty({ description: 'Webhook endpoint ID', example: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d' })
  id: string;

  @ApiProperty({ description: 'Display name for the endpoint', nullable: true, example: 'Production pipeline' })
  name: string | null;

  @ApiProperty({ description: 'URL events are delivered to', example: 'https://example.com/webhooks/scrapio' })
  url: string;

  @ApiProperty({
    type: [String],
    enum: WebhookEventType,
    description: 'Which events this endpoint receives',
    example: [WebhookEventType.WORKFLOW_RUN_SUCCEEDED, WebhookEventType.WORKFLOW_RUN_FAILED],
  })
  subscribed_events: WebhookEventType[];

  @ApiProperty({ description: 'Whether delivery is currently enabled', example: true })
  is_active: boolean;

  @ApiProperty({ description: 'When the last delivery attempt was made', nullable: true, example: '2026-08-13T15:00:00.000Z' })
  last_triggered_at: Date | null;

  @ApiProperty({ description: 'When the endpoint was created', example: '2026-01-05T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'When the endpoint was last updated', example: '2026-01-05T12:00:00.000Z' })
  updated_at: Date;
}
