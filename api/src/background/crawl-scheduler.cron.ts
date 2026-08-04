import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { parseExpression } from 'cron-parser';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import { ScraperStatus } from 'generated/prisma';
import type { EnvConfig } from '@/shared/config/env/env.validation';

const MANUAL_ONLY_CRAWL_ENVS: ReadonlySet<EnvConfig['NODE_ENV']> = new Set([
  'local',
  'development',
  'staging',
]);

const DEFAULT_CRAWL_SCHEDULE_TZ = 'Europe/Athens';

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
    const scheduleTz =
      this.configService.get<string>('CRAWL_SCHEDULE_TZ') ??
      DEFAULT_CRAWL_SCHEDULE_TZ;

    const websiteTargets = await this.prisma.websiteTarget.findMany({
      select: { id: true, crawl_interval: true },
    });

    for (const websiteTarget of websiteTargets) {
      if (!this.isCronDue(websiteTarget.crawl_interval, now, scheduleTz)) {
        continue;
      }

      const hasActiveRun =
        await this.crawlRunsService.hasActiveRunForWebsiteTarget(
          websiteTarget.id,
        );
      if (hasActiveRun) {
        continue;
      }

      const scraper = await this.prisma.scraper.findFirst({
        where: {
          website_target_id: websiteTarget.id,
          status: { in: [ScraperStatus.ACTIVE, ScraperStatus.TESTING] },
        },
        orderBy: { updated_at: 'desc' },
        select: { id: true },
      });

      if (!scraper) {
        this.logger.warn(
          `website target ${websiteTarget.id}: no scraper — skipping`,
        );
        continue;
      }

      try {
        await this.crawlRunsService.enqueue(websiteTarget.id, scraper.id);
        this.logger.log(
          `scheduled crawl enqueued for website target ${websiteTarget.id}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `failed to enqueue scheduled crawl for website target ${websiteTarget.id}: ${message}`,
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
        `invalid crawl_interval "${cronExpression}": ${message}`,
      );
      return false;
    }
  }
}
