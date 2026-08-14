import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import {
  AuthRole,
  NotificationSeverity,
  NotificationType,
} from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { NotificationsService } from './notifications.service';
import {
  NotificationQuerySchema,
  NotificationQueryType,
} from './dto/notification-query.schema';
import { DeleteNotificationsDto } from './dto/delete-notifications.dto';
import { Notification } from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType, description: 'Filter by notification type' })
  @ApiQuery({ name: 'severity', required: false, enum: NotificationSeverity, description: 'Filter by severity' })
  @ApiQuery({ name: 'is_read', required: false, enum: ['true', 'false'], description: 'Filter by read status' })
  @ApiPaginatedResponse(Notification, 'Paginated notification list')
  findAll(
    @Query(new ZodValidationPipe(NotificationQuerySchema))
    query: NotificationQueryType,
  ) {
    return this.notificationsService.findAll(query);
  }

  @Patch('read-all')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of updated notifications' })
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Post('bulk-delete')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: 200, description: 'Count of deleted notifications' })
  removeMany(@Body() dto: DeleteNotificationsDto) {
    return this.notificationsService.removeMany(dto.ids);
  }

  @Patch(':id/read')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
