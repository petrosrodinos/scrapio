import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ScraperGenerationService } from '@/modules/scraper-generation/scraper-generation.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  GenerationTrigger,
  NotificationSeverity,
  NotificationType,
  ScraperStatus,
} from 'generated/prisma';

@Injectable()
export class ScraperFailureHandlerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperGenerationService: ScraperGenerationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handle(params: {
    workflowConfig: {
      id: string;
      self_healing_enabled: boolean;
      consecutive_failures: number;
    };
    workflowRunId: string;
    websiteTargetId: string;
    userId: string;
    zeroListingsPage0: boolean;
    networkError: boolean;
    errorMessage: string;
  }): Promise<void> {
    const nextFailures = params.workflowConfig.consecutive_failures + 1;
    const shouldMarkBroken =
      params.zeroListingsPage0 || params.networkError || nextFailures >= 3;

    const failedAt = new Date();

    await Promise.all([
      this.prisma.workflowConfig.update({
        where: { id: params.workflowConfig.id },
        data: {
          consecutive_failures: nextFailures,
          last_failure_at: failedAt,
          ...(shouldMarkBroken ? { status: ScraperStatus.BROKEN } : {}),
        },
      }),
      this.prisma.websiteTarget.update({
        where: { id: params.websiteTargetId },
        data: {
          last_failure_at: failedAt,
          last_error_message: params.errorMessage,
        },
      }),
    ]);

    if (!shouldMarkBroken) return;

    if (params.networkError) {
      this.notificationsService.create({
        type: NotificationType.WEBSITE_UNAVAILABLE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Website unavailable',
        message: params.errorMessage,
        website_target_id: params.websiteTargetId,
        workflow_config_id: params.workflowConfig.id,
        workflow_run_id: params.workflowRunId,
        user_id: params.userId,
      });
    } else {
      this.notificationsService.create({
        type: NotificationType.BROKEN_SCRAPER,
        severity: NotificationSeverity.WARNING,
        title: 'Scraper marked as broken',
        message: params.errorMessage,
        website_target_id: params.websiteTargetId,
        workflow_config_id: params.workflowConfig.id,
        workflow_run_id: params.workflowRunId,
        user_id: params.userId,
      });
    }

    if (params.workflowConfig.self_healing_enabled) {
      const selfHealPrompt = `Self-heal triggered after crawl failure: ${params.errorMessage}`;
      const retried = await this.scraperGenerationService.retryLatestForScraper(
        params.workflowConfig.id,
        params.errorMessage,
        selfHealPrompt,
      );

      if (!retried) {
        await this.scraperGenerationService.trigger(
          params.websiteTargetId,
          params.workflowConfig.id,
          GenerationTrigger.SELF_HEAL,
          selfHealPrompt,
        );
      }
    }
  }
}
