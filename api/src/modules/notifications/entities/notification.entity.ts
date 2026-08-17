import { ApiProperty } from '@nestjs/swagger';
import { NotificationSeverity, NotificationType } from 'generated/prisma';

export class Notification {
  @ApiProperty({ description: 'Notification ID', example: 'b3f1e2a0-1234-4a5b-9c6d-7e8f9a0b1c2d' })
  id: string;

  @ApiProperty({ enum: NotificationType, description: 'What triggered the notification' })
  type: NotificationType;

  @ApiProperty({ enum: NotificationSeverity, description: 'How severe the notification is' })
  severity: NotificationSeverity;

  @ApiProperty({ description: 'Short summary', example: 'Scraper marked as broken' })
  title: string;

  @ApiProperty({
    description: 'Full notification message',
    example: 'Scraper "Product listings" was automatically disabled after repeated failures.',
  })
  message: string;

  @ApiProperty({
    description: 'Related website target ID, if applicable',
    nullable: true,
    example: '7c1e6b2a-4321-4f5e-8a9b-0c1d2e3f4a5b',
  })
  website_target_id: string | null;

  @ApiProperty({
    description: 'Related workflow config ID, if applicable',
    nullable: true,
    example: '7c1e6b2a-4321-4f5e-8a9b-0c1d2e3f4a5b',
  })
  workflow_config_id: string | null;

  @ApiProperty({
    description: 'Related workflow run ID, if applicable',
    nullable: true,
    example: 'c4a2f3b1-2345-4b6c-8d7e-9f0a1b2c3d4e',
  })
  workflow_run_id: string | null;

  @ApiProperty({
    description: 'Related user ID, if applicable',
    nullable: true,
    example: 'b4a3c2d1-e0f9-4a8b-9c7d-6e5f4a3b2c1d',
  })
  user_id: string | null;

  @ApiProperty({ description: 'Whether the notification has been marked as read', example: false })
  is_read: boolean;

  @ApiProperty({ description: 'When the notification was created', example: '2026-08-13T15:00:00.000Z' })
  created_at: Date;
}
