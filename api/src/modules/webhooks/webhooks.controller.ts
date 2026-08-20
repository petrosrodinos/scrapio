import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { AuthRole, WebhookDeliveryStatus, WebhookEventType } from 'generated/prisma';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { SendTestEventDto } from './dto/send-test-event.dto';
import { WebhookDeliveryQuerySchema, WebhookDeliveryQueryType } from './dto/webhook-delivery-query.schema';
import { WebhookEndpointEntity } from './entities/webhook-endpoint.entity';
import { WebhookDeliveryEntity } from './entities/webhook-delivery.entity';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.SUPPORT)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('event-catalog')
  @ApiOperation({ summary: 'List available webhook event types, descriptions, and sample payloads' })
  @ApiResponse({
    status: 200,
    description:
      'Array of event catalog entries, each with event_type, name, label, description, and sample_payload',
  })
  getEventCatalog() {
    return this.webhooksService.getEventCatalog();
  }

  @Get()
  @ApiOperation({ summary: 'List my webhook endpoints' })
  @ApiResponse({ status: 200, type: [WebhookEndpointEntity] })
  findAll(@CurrentUser() authUser: AuthUser) {
    return this.webhooksService.findAll(authUser);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({ status: 201, type: WebhookEndpointEntity })
  create(@CurrentUser() authUser: AuthUser, @Body() dto: CreateWebhookEndpointDto) {
    return this.webhooksService.create(authUser, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, type: WebhookEndpointEntity })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.webhooksService.findOne(authUser, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, type: WebhookEndpointEntity })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.webhooksService.update(authUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint deleted' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.webhooksService.remove(authUser, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List delivery attempts for a webhook endpoint (paginated, filterable)' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)' })
  @ApiQuery({ name: 'status', required: false, enum: WebhookDeliveryStatus, description: 'Filter by delivery status' })
  @ApiQuery({ name: 'event_type', required: false, enum: WebhookEventType, description: 'Filter by event type' })
  @ApiPaginatedResponse(WebhookDeliveryEntity, 'Paginated webhook delivery list')
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  findDeliveries(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(WebhookDeliveryQuerySchema)) query: WebhookDeliveryQueryType,
  ) {
    return this.webhooksService.findDeliveries(authUser, id, query);
  }

  @Post(':id/deliveries/:deliveryId/resend')
  @ApiOperation({ summary: 'Resend a webhook delivery attempt using its original payload' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiParam({ name: 'deliveryId', description: 'Webhook delivery ID' })
  @ApiResponse({ status: 201, type: WebhookDeliveryEntity })
  @ApiResponse({ status: 404, description: 'Webhook endpoint or delivery not found' })
  resendDelivery(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooksService.resendDelivery(authUser, id, deliveryId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a synthetic test event to a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook endpoint ID' })
  @ApiResponse({ status: 201, type: WebhookDeliveryEntity })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found, or event_type is not a known event' })
  sendTestEvent(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendTestEventDto,
  ) {
    return this.webhooksService.sendTestEvent(authUser, id, dto);
  }
}
