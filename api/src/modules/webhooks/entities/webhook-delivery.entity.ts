import { ApiProperty } from '@nestjs/swagger';
import { WebhookDeliveryStatus, WebhookEventType } from 'generated/prisma';

export class WebhookDeliveryEntity {
  @ApiProperty({ description: 'Webhook delivery ID', example: 'c4a2f3b1-2345-4b6c-8d7e-9f0a1b2c3d4e' })
  id: string;

  @ApiProperty({ enum: WebhookEventType, description: 'Event type that triggered this delivery' })
  event_type: WebhookEventType;

  @ApiProperty({
    description: 'ID of the workflow run that triggered this delivery, if any (null for synthetic test events)',
    nullable: true,
    example: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d',
  })
  workflow_run_id: string | null;

  @ApiProperty({ description: 'Whether this was a synthetic test delivery triggered via the test endpoint', example: false })
  is_test: boolean;

  @ApiProperty({ description: 'JSON payload that was sent to the endpoint' })
  payload: Record<string, unknown>;

  @ApiProperty({ enum: WebhookDeliveryStatus, description: 'Outcome of the delivery attempt' })
  status: WebhookDeliveryStatus;

  @ApiProperty({ description: 'HTTP status code returned by the receiving endpoint', nullable: true, example: 200 })
  http_status_code: number | null;

  @ApiProperty({ description: 'Truncated response body returned by the receiving endpoint', nullable: true, example: 'OK' })
  response_body: string | null;

  @ApiProperty({ description: 'Error message if the delivery failed (e.g. timeout, connection refused)', nullable: true, example: null })
  error_message: string | null;

  @ApiProperty({ description: 'Which attempt this was (1 for the first try)', example: 1 })
  attempt_number: number;

  @ApiProperty({ description: 'How long the delivery request took, in milliseconds', nullable: true, example: 245 })
  duration_ms: number | null;

  @ApiProperty({ description: 'When this delivery attempt was made', example: '2026-08-13T15:00:00.000Z' })
  created_at: Date;
}
