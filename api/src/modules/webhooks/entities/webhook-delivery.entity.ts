import { ApiProperty } from '@nestjs/swagger';
import { WebhookDeliveryStatus, WebhookEventType } from 'generated/prisma';

export class WebhookDeliveryEntity {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WebhookEventType })
  event_type: WebhookEventType;

  @ApiProperty({ nullable: true })
  workflow_run_id: string | null;

  @ApiProperty()
  is_test: boolean;

  @ApiProperty()
  payload: Record<string, unknown>;

  @ApiProperty({ enum: WebhookDeliveryStatus })
  status: WebhookDeliveryStatus;

  @ApiProperty({ nullable: true })
  http_status_code: number | null;

  @ApiProperty({ nullable: true })
  response_body: string | null;

  @ApiProperty({ nullable: true })
  error_message: string | null;

  @ApiProperty()
  attempt_number: number;

  @ApiProperty({ nullable: true })
  duration_ms: number | null;

  @ApiProperty()
  created_at: Date;
}
