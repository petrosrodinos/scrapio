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
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
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
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType, description: 'Filter by notification type' })
  @ApiQuery({ name: 'severity', required: false, enum: NotificationSeverity, description: 'Filter by severity' })
  @ApiQuery({ name: 'is_read', required: false, enum: ['true', 'false'], description: 'Filter by read status' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by user id (admin/support only)' })
  @ApiPaginatedResponse(Notification, 'Paginated notification list')
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(NotificationQuerySchema))
    query: NotificationQueryType,
  ) {
    return this.notificationsService.findAll(authUser, query);
  }

  @Patch('read-all')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of updated notifications' })
  markAllRead(@CurrentUser() authUser: AuthUser) {
    return this.notificationsService.markAllRead(authUser);
  }

  @Post('bulk-delete')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: 200, description: 'Count of deleted notifications' })
  removeMany(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: DeleteNotificationsDto,
  ) {
    return this.notificationsService.removeMany(authUser, dto.ids);
  }

  @Patch(':id/read')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markRead(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(authUser, id);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.notificationsService.remove(authUser, id);
  }
}
