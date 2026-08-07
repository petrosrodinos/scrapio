import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { parseExpression } from 'cron-parser';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import { DEFAULT_CRAWL_SCHEDULE_TZ } from '@/shared/config/crawl-schedule-timezones.config';
import { ScraperStatus, WorkflowType } from 'generated/prisma';
import type { EnvConfig } from '@/shared/config/env/env.validation';

const MANUAL_ONLY_CRAWL_ENVS: ReadonlySet<EnvConfig['NODE_ENV']> = new Set([
  'local',
  'development',
  'staging',
]);

@Injectable()
export class CrawlSchedulerCron {
  private readonly logger = new Logger(CrawlSchedulerCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlRunsService: CrawlRunsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueWebsiteTargetRuns(): Promise<void> {
    const nodeEnv = this.configService.get<EnvConfig['NODE_ENV']>('NODE_ENV');
    if (nodeEnv && MANUAL_ONLY_CRAWL_ENVS.has(nodeEnv)) {
      return;
    }

    const now = new Date();

    const configs = await this.prisma.workflowConfig.findMany({
      where: {
        type: WorkflowType.SCRAPER,
        schedule_enabled: true,
        schedule_cron: { not: null },
        status: { in: [ScraperStatus.ACTIVE, ScraperStatus.TESTING] },
        website_target_id: { not: null },
      },
      select: {
        id: true,
        website_target_id: true,
        schedule_cron: true,
        schedule_timezone: true,
        user: { select: { default_schedule_tz: true } },
      },
    });

    for (const config of configs) {
      const scheduleTz =
        config.schedule_timezone ||
        config.user.default_schedule_tz ||
        DEFAULT_CRAWL_SCHEDULE_TZ;

      if (!this.isCronDue(config.schedule_cron!, now, scheduleTz)) {
        continue;
      }

      const hasActiveRun =
        await this.crawlRunsService.hasActiveRunForWebsiteTarget(
          config.website_target_id!,
        );
      if (hasActiveRun) {
        continue;
      }

      try {
        await this.crawlRunsService.enqueue(
          config.website_target_id!,
          config.id,
        );
        this.logger.log(
          `scheduled crawl enqueued for workflow config ${config.id}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `failed to enqueue scheduled crawl for workflow config ${config.id}: ${message}`,
        );
      }
    }
  }

  private isCronDue(
    cronExpression: string,
    now: Date,
    tz: string,
  ): boolean {
    try {
      const interval = parseExpression(cronExpression, {
        currentDate: now,
        tz,
      });
      const prev = interval.prev().toDate();
      const msSincePrev = now.getTime() - prev.getTime();
      return msSincePrev >= 0 && msSincePrev < 60_000;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `invalid schedule_cron "${cronExpression}": ${message}`,
      );
      return false;
    }
  }
}
