import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { WEBHOOK_DELIVERY_CONCURRENCY, WEBHOOK_DELIVERY_QUEUE } from '@/core/queues/queues.constants';
import { WebhookDeliveryService } from '@/modules/webhooks/services/webhook-delivery.service';
import { WebhookEventType } from 'generated/prisma';

interface WebhookDeliveryJobData {
  webhookEndpointId: string;
  eventType: WebhookEventType;
  payload: object;
  workflowRunId?: string | null;
}

@Processor(WEBHOOK_DELIVERY_QUEUE, { concurrency: WEBHOOK_DELIVERY_CONCURRENCY })
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: WebhookDeliveryService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobData>): Promise<void> {
    const { webhookEndpointId, eventType, payload, workflowRunId } = job.data;

    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: webhookEndpointId },
    });

    if (!endpoint || !endpoint.is_active) {
      this.logger.warn(
        `Skipping webhook delivery for ${webhookEndpointId}: endpoint missing or disabled`,
      );
      return;
    }

    const { success } = await this.delivery.deliverOnce({
      endpoint,
      eventType,
      payload,
      attemptNumber: job.attemptsMade + 1,
      workflowRunId,
    });

    if (!success) {
      throw new Error(`Webhook delivery to ${endpoint.url} failed`);
    }
  }
}
