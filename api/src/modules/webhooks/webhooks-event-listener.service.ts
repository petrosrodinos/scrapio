import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  WEBHOOK_DELIVERY_BACKOFF_MS,
  WEBHOOK_DELIVERY_MAX_ATTEMPTS,
  WEBHOOK_DELIVERY_QUEUE,
} from '@/core/queues/queues.constants';
import {
  WORKFLOW_RUN_STATUS_CHANGED_EVENT,
  WorkflowRunStatusChangedEvent,
} from '@/shared/interfaces/workflow-run-status-changed.event';
import { WebhookEventType } from 'generated/prisma';
import {
  RUN_STATUS_TO_WEBHOOK_EVENT,
  TERMINAL_RUN_STATUSES,
  WEBHOOK_EVENT_NAME_BY_TYPE,
} from './constants/webhook-event-catalog.constant';

interface WebhookDeliveryJobData {
  webhookEndpointId: string;
  eventType: WebhookEventType;
  payload: object;
  workflowRunId?: string | null;
}

@Injectable()
export class WebhooksEventListenerService {
  private readonly logger = new Logger(WebhooksEventListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue<WebhookDeliveryJobData>,
  ) {}

  @OnEvent(WORKFLOW_RUN_STATUS_CHANGED_EVENT)
  async handleStatusChanged(event: WorkflowRunStatusChangedEvent): Promise<void> {
    try {
      const eventType = RUN_STATUS_TO_WEBHOOK_EVENT[event.status];

      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: {
          user_id: event.userId,
          is_active: true,
          subscribed_events: { has: eventType },
        },
      });

      if (endpoints.length === 0) {
        return;
      }

      const result =
        !event.persistResults && TERMINAL_RUN_STATUSES.includes(event.status)
          ? await this.loadUnpersistedResult(event.workflowRunId)
          : null;

      const payload = {
        event: WEBHOOK_EVENT_NAME_BY_TYPE[eventType],
        created_at: new Date().toISOString(),
        data: {
          workflow_run_id: event.workflowRunId,
          workflow_config_id: event.workflowConfigId,
          type: event.type,
          status: event.status,
          error_message: event.errorMessage ?? null,
          started_at: event.startedAt ?? null,
          finished_at: event.finishedAt ?? null,
          duration_ms: event.durationMs ?? null,
          ...(result && { result }),
        },
      };

      await Promise.all(
        endpoints.map((endpoint) =>
          this.deliveryQueue.add(
            'deliver',
            {
              webhookEndpointId: endpoint.id,
              eventType,
              payload,
              workflowRunId: event.workflowRunId,
            },
            {
              attempts: WEBHOOK_DELIVERY_MAX_ATTEMPTS,
              backoff: { type: 'exponential', delay: WEBHOOK_DELIVERY_BACKOFF_MS },
            },
          ),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to dispatch webhook deliveries: ${message}`);
    }
  }

  // Result content this run's WorkflowRunPurgeService is about to delete (see
  // WorkflowRunPurgeService.purgeIfForgettable) — the delivered payload is the only place a
  // forget-mode subscriber can still get it after that.
  private async loadUnpersistedResult(workflowRunId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      select: {
        collected_data: true,
        extraction_result: true,
        pages: {
          orderBy: { created_at: 'asc' },
          select: {
            requested_url: true,
            final_url: true,
            http_status: true,
            success: true,
            title: true,
            raw_html: true,
            cleaned_content: true,
            error_message: true,
            extraction_result: true,
          },
        },
      },
    });

    if (!run) return null;
    if (!run.extraction_result && !run.collected_data && run.pages.length === 0) {
      return null;
    }

    return {
      collected_data: run.collected_data ?? undefined,
      extraction_result: run.extraction_result ?? undefined,
      pages: run.pages.length > 0 ? run.pages : undefined,
    };
  }
}
