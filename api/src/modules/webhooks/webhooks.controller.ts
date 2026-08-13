import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AuthRole } from 'generated/prisma';
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
  @ApiResponse({ status: 200, type: WebhookEndpointEntity })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.webhooksService.findOne(authUser, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiResponse({ status: 200, type: WebhookEndpointEntity })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    return this.webhooksService.update(authUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiResponse({ status: 200 })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.webhooksService.remove(authUser, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List delivery attempts for a webhook endpoint' })
  @ApiResponse({ status: 200, type: [WebhookDeliveryEntity] })
  findDeliveries(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(WebhookDeliveryQuerySchema)) query: WebhookDeliveryQueryType,
  ) {
    return this.webhooksService.findDeliveries(authUser, id, query);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a synthetic test event to a webhook endpoint' })
  @ApiResponse({ status: 201, type: WebhookDeliveryEntity })
  sendTestEvent(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendTestEventDto,
  ) {
    return this.webhooksService.sendTestEvent(authUser, id, dto);
  }
}
