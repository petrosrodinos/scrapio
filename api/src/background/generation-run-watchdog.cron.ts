import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  GENERATION_JOB_LOCK_DURATION_MS,
  GENERATION_STALE_GRACE_MS,
} from '@/integrations/computer-use/constants/generation.constants';
import {
  GenerationRunStatus,
  NotificationSeverity,
  NotificationType,
} from 'generated/prisma';

@Injectable()
export class GenerationRunWatchdogCron {
  private readonly logger = new Logger(GenerationRunWatchdogCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async failStaleGenerationRuns(): Promise<void> {
    const staleBefore = new Date(
      Date.now() - GENERATION_JOB_LOCK_DURATION_MS - GENERATION_STALE_GRACE_MS,
    );

    const candidates = await this.prisma.scraperGenerationRun.findMany({
      where: {
        status: {
          in: [GenerationRunStatus.QUEUED, GenerationRunStatus.RUNNING],
        },
      },
      select: {
        id: true,
        status: true,
        started_at: true,
        created_at: true,
        website_target_id: true,
        workflow_config_id: true,
        steps: {
          orderBy: { step_index: 'desc' },
          take: 1,
          select: { created_at: true },
        },
      },
    });

    for (const run of candidates) {
      const lastActivity =
        run.steps[0]?.created_at ?? run.started_at ?? run.created_at;

      if (lastActivity >= staleBefore) {
        continue;
      }

      const finishedAt = new Date();
      const staleMinutes = Math.round(
        (GENERATION_JOB_LOCK_DURATION_MS + GENERATION_STALE_GRACE_MS) / 60_000,
      );
      const errorMessage = `Watchdog: generation run stuck in ${run.status} past ${staleMinutes} minutes with no step activity — likely worker crash/restart mid-job`;

      const updated = await this.prisma.scraperGenerationRun.updateMany({
        where: {
          id: run.id,
          status: {
            in: [GenerationRunStatus.QUEUED, GenerationRunStatus.RUNNING],
          },
        },
        data: {
          status: GenerationRunStatus.FAILED,
          error_message: errorMessage,
          finished_at: finishedAt,
          duration_ms: run.started_at
            ? finishedAt.getTime() - run.started_at.getTime()
            : null,
        },
      });

      if (updated.count === 0) {
        continue;
      }

      this.notificationsService.create({
        type: NotificationType.QUEUE_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Generation run stuck and auto-failed by watchdog',
        message: errorMessage,
        website_target_id: run.website_target_id,
        workflow_config_id: run.workflow_config_id ?? undefined,
      });

      this.logger.warn(`watchdog failed stale generation run ${run.id}`);
    }
  }
}
