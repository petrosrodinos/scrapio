import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { WEBHOOK_DELIVERY_TIMEOUT_MS } from '@/core/queues/queues.constants';
import { WebhookDelivery, WebhookDeliveryStatus, WebhookEndpoint, WebhookEventType } from 'generated/prisma';
import { WebhookSecretCryptoService } from '../utils/webhook-secret-crypto.service';

const RESPONSE_BODY_MAX_LENGTH = 2000;

interface DeliverOnceParams {
  endpoint: WebhookEndpoint;
  eventType: WebhookEventType;
  payload: object;
  attemptNumber: number;
  workflowRunId?: string | null;
  isTest?: boolean;
}

interface DeliverOnceResult {
  delivery: WebhookDelivery;
  success: boolean;
}

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretCrypto: WebhookSecretCryptoService,
  ) {}

  async deliverOnce(params: DeliverOnceParams): Promise<DeliverOnceResult> {
    const { endpoint, eventType, payload, attemptNumber, workflowRunId, isTest } = params;
    const body = JSON.stringify(payload);
    const startedAt = Date.now();

    let httpStatusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let status: WebhookDeliveryStatus;

    try {
      const secret = this.secretCrypto.decrypt(endpoint.secret_encrypted);
      const signature = this.secretCrypto.sign(body, secret);

      const response = await axios.post(endpoint.url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Scrapio-Signature': `sha256=${signature}`,
          'X-Scrapio-Event': eventType,
        },
        timeout: WEBHOOK_DELIVERY_TIMEOUT_MS,
        validateStatus: () => true,
      });

      httpStatusCode = response.status;
      responseBody = String(
        typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? ''),
      ).slice(0, RESPONSE_BODY_MAX_LENGTH);
      status =
        response.status >= 200 && response.status < 300
          ? WebhookDeliveryStatus.SUCCESS
          : WebhookDeliveryStatus.FAILED;
      if (status === WebhookDeliveryStatus.FAILED) {
        errorMessage = `Endpoint responded with HTTP ${response.status}`;
      }
    } catch (error) {
      status = WebhookDeliveryStatus.FAILED;
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    const durationMs = Date.now() - startedAt;

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhook_endpoint_id: endpoint.id,
        event_type: eventType,
        workflow_run_id: workflowRunId ?? null,
        is_test: isTest ?? false,
        payload: payload as any,
        status,
        http_status_code: httpStatusCode,
        response_body: responseBody,
        error_message: errorMessage,
        attempt_number: attemptNumber,
        duration_ms: durationMs,
      },
    });

    if (status === WebhookDeliveryStatus.SUCCESS) {
      await this.prisma.webhookEndpoint
        .update({ where: { id: endpoint.id }, data: { last_triggered_at: new Date() } })
        .catch((error) => {
          this.logger.error(
            `Failed to update last_triggered_at for webhook endpoint ${endpoint.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    }

    return { delivery, success: status === WebhookDeliveryStatus.SUCCESS };
  }
}
