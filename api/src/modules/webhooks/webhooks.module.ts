import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { WEBHOOK_DELIVERY_QUEUE } from '@/core/queues/queues.constants';
import { WebhookDeliveryProcessor } from '@/background/webhook-delivery.processor';
import { CrawlRunsModule } from '@/modules/crawl-runs/crawl-runs.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksEventListenerService } from './webhooks-event-listener.service';
import { WebhookDeliveryService } from './services/webhook-delivery.service';
import { WebhookSecretCryptoService } from './utils/webhook-secret-crypto.service';

@Module({
  imports: [
    PrismaModule,
    CrawlRunsModule,
    BullModule.registerQueue({ name: WEBHOOK_DELIVERY_QUEUE }),
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhooksEventListenerService,
    WebhookDeliveryService,
    WebhookSecretCryptoService,
    WebhookDeliveryProcessor,
  ],
})
export class WebhooksModule {}
