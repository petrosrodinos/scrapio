import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { PaginatedResult } from '@/shared/interfaces/paginated-result.interface';
import { WebhookEndpoint } from 'generated/prisma';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { SendTestEventDto } from './dto/send-test-event.dto';
import { WebhookDeliveryQueryType } from './dto/webhook-delivery-query.schema';
import { WebhookEndpointEntity } from './entities/webhook-endpoint.entity';
import { WebhookDeliveryEntity } from './entities/webhook-delivery.entity';
import { WebhookSecretCryptoService } from './utils/webhook-secret-crypto.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WEBHOOK_EVENT_CATALOG, WebhookEventCatalogEntry } from './constants/webhook-event-catalog.constant';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: WebhookSecretCryptoService,
    private readonly delivery: WebhookDeliveryService,
  ) {}

  getEventCatalog(): WebhookEventCatalogEntry[] {
    return WEBHOOK_EVENT_CATALOG;
  }

  async create(authUser: AuthUser, dto: CreateWebhookEndpointDto): Promise<WebhookEndpointEntity> {
    const created = await this.prisma.webhookEndpoint.create({
      data: {
        user_id: authUser.id,
        name: dto.name,
        url: dto.url,
        secret_encrypted: this.secretCrypto.encrypt(dto.secret),
        subscribed_events: dto.subscribed_events,
      },
    });

    return this.toResponse(created);
  }

  async findAll(authUser: AuthUser): Promise<WebhookEndpointEntity[]> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { user_id: authUser.id },
      orderBy: { created_at: 'desc' },
    });
    return endpoints.map((endpoint) => this.toResponse(endpoint));
  }

  async findOne(authUser: AuthUser, id: string): Promise<WebhookEndpointEntity> {
    const endpoint = await this.ensureOwned(authUser, id);
    return this.toResponse(endpoint);
  }

  async update(
    authUser: AuthUser,
    id: string,
    dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpointEntity> {
    const existing = await this.ensureOwned(authUser, id);

    const updated = await this.prisma.webhookEndpoint.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.secret !== undefined && { secret_encrypted: this.secretCrypto.encrypt(dto.secret) }),
        ...(dto.subscribed_events !== undefined && { subscribed_events: dto.subscribed_events }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });

    return this.toResponse(updated);
  }

  async remove(authUser: AuthUser, id: string): Promise<{ message: string }> {
    const existing = await this.ensureOwned(authUser, id);
    await this.prisma.webhookEndpoint.delete({ where: { id: existing.id } });
    return { message: 'Webhook endpoint deleted successfully' };
  }

  async findDeliveries(
    authUser: AuthUser,
    endpointId: string,
    query: WebhookDeliveryQueryType,
  ): Promise<PaginatedResult<WebhookDeliveryEntity>> {
    const endpoint = await this.ensureOwned(authUser, endpointId);

    const where = {
      webhook_endpoint_id: endpoint.id,
      ...(query.status && { status: query.status }),
      ...(query.event_type && { event_type: query.event_type }),
    };

    const [items, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return {
      data: items as unknown as WebhookDeliveryEntity[],
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next: query.page < Math.ceil(total / query.limit),
        has_prev: query.page > 1,
      },
    };
  }

  async sendTestEvent(
    authUser: AuthUser,
    endpointId: string,
    dto: SendTestEventDto,
  ): Promise<WebhookDeliveryEntity> {
    const endpoint = await this.ensureOwned(authUser, endpointId);

    const catalogEntry = WEBHOOK_EVENT_CATALOG.find((entry) => entry.event_type === dto.event_type);
    if (!catalogEntry) {
      throw new NotFoundException('Unknown event type');
    }

    const { delivery } = await this.delivery.deliverOnce({
      endpoint,
      eventType: dto.event_type,
      payload: catalogEntry.sample_payload,
      attemptNumber: 1,
      isTest: true,
    });

    return delivery as unknown as WebhookDeliveryEntity;
  }

  private async ensureOwned(authUser: AuthUser, id: string): Promise<WebhookEndpoint> {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, user_id: authUser.id },
    });
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }
    return endpoint;
  }

  private toResponse(endpoint: WebhookEndpoint): WebhookEndpointEntity {
    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      subscribed_events: endpoint.subscribed_events,
      is_active: endpoint.is_active,
      last_triggered_at: endpoint.last_triggered_at,
      created_at: endpoint.created_at,
      updated_at: endpoint.updated_at,
    };
  }
}
