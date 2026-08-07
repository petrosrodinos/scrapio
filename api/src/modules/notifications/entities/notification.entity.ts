import { ApiProperty } from '@nestjs/swagger';
import { NotificationSeverity, NotificationType } from 'generated/prisma';

export class Notification {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationSeverity })
  severity: NotificationSeverity;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ nullable: true })
  website_target_id: string | null;

  @ApiProperty({ nullable: true })
  workflow_config_id: string | null;

  @ApiProperty({ nullable: true })
  workflow_run_id: string | null;

  @ApiProperty()
  is_read: boolean;

  @ApiProperty()
  created_at: Date;
}
