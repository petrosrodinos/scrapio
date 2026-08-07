import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ScraperFailureHandlerService } from './scraper-failure-handler.service';
import { PlatformConfigService } from '@/modules/platform-config/platform-config.service';
import {
  JobStatus,
  NotificationSeverity,
  NotificationType,
  RunStatus,
} from 'generated/prisma';

const STALE_GRACE_MS = 5 * 60_000;

@Injectable()
export class CrawlRunWatchdogCron {
  private readonly logger = new Logger(CrawlRunWatchdogCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly scraperFailureHandler: ScraperFailureHandlerService,
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async failStaleRunningRuns(): Promise<void> {
    const { crawl_job_timeout_ms } =
      await this.platformConfigService.getCrawlerConfig();
    const activityStaleBefore = new Date(
      Date.now() - crawl_job_timeout_ms - STALE_GRACE_MS,
    );
    const absoluteStaleBefore = new Date(
      Date.now() - 2 * crawl_job_timeout_ms - STALE_GRACE_MS,
    );

    const staleRuns = await this.prisma.workflowRun.findMany({
      where: {
        status: RunStatus.RUNNING,
        OR: [
          { updated_at: { lt: activityStaleBefore } },
          { started_at: { lt: absoluteStaleBefore } },
        ],
      },
      include: { workflow_config: true },
    });

    for (const run of staleRuns) {
      const finishedAt = new Date();
      const errorMessage = `Watchdog: run stuck in RUNNING past ${Math.round(
        (crawl_job_timeout_ms + STALE_GRACE_MS) / 60_000,
      )} minutes with no update -- likely a worker crash/restart mid-job`;

      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: RunStatus.FAILED,
          finished_at: finishedAt,
          duration_ms: run.started_at
            ? finishedAt.getTime() - run.started_at.getTime()
            : null,
          error_message: errorMessage,
        },
      });

      await this.prisma.jobLog.updateMany({
        where: { workflow_run_id: run.id, status: JobStatus.ACTIVE },
        data: {
          status: JobStatus.FAILED,
          finished_at: finishedAt,
          error_message: errorMessage,
        },
      });

      this.notificationsService.create({
        type: NotificationType.LARGE_CRAWL_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Run stuck and auto-failed by watchdog',
        message: errorMessage,
        website_target_id: run.website_target_id ?? undefined,
        workflow_config_id: run.workflow_config_id,
        workflow_run_id: run.id,
      });

      if (run.workflow_config) {
        await this.scraperFailureHandler.handle({
          workflowConfig: run.workflow_config,
          workflowRunId: run.id,
          websiteTargetId: run.website_target_id!,
          zeroListingsPage0: false,
          networkError: false,
          errorMessage,
        });
      }

      this.logger.warn(`watchdog failed stale workflow run ${run.id}`);
    }
  }
}
