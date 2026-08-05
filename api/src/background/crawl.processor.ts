import { Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CRAWL_QUEUE } from '@/core/queues/queues.constants';
import {
  DEFAULT_CRAWL_WORKER_CONCURRENCY,
  DETAIL_ENRICHMENT_SOFT_STOP_BUFFER_MS,
} from '@/integrations/crawler/constants/crawler.constants';
import { PlatformConfigService } from '@/modules/platform-config/platform-config.service';
import { CrawlerService } from '@/integrations/crawler/services/crawler.service';
import { DetailEnrichmentService } from '@/integrations/crawler/services/detail-enrichment.service';
import { ScraperConfig } from '@/integrations/crawler/interfaces/scraper-config.interface';
import { DiagnosticsRunContext } from '@/integrations/diagnostics/interfaces/diagnostics.interfaces';
import { contentHash } from '@/integrations/crawler/utils/crawler.utils';
import { buildBlockHandlingConfig } from '@/integrations/crawler/block-handling/block-handling.utils';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ScraperFailureHandlerService } from '@/background/scraper-failure-handler.service';
import {
  CrawlRunStatus,
  JobStatus,
  NotificationSeverity,
  NotificationType,
  Prisma,
} from 'generated/prisma';

interface CrawlJobData {
  crawlRunId: string;
  jobLogId?: string;
}

function extractExternalId(
  sourceUrl: string,
  raw: Record<string, unknown>,
): string | null {
  for (const key of ['_external_id', 'external_id', 'id', '_id']) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  const segments = sourceUrl.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? null;
}

@Processor(CRAWL_QUEUE, { concurrency: DEFAULT_CRAWL_WORKER_CONCURRENCY })
export class CrawlProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(CrawlProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlerService: CrawlerService,
    private readonly detailEnrichmentService: DetailEnrichmentService,
    private readonly notificationsService: NotificationsService,
    private readonly scraperFailureHandler: ScraperFailureHandlerService,
    private readonly platformConfigService: PlatformConfigService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const { crawl_worker_concurrency } =
      await this.platformConfigService.getCrawlerConfig();
    this.worker.concurrency = crawl_worker_concurrency;
  }

  async process(job: Job<CrawlJobData>): Promise<void> {
    try {
      await this.processCrawlJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notificationsService.create({
        type: NotificationType.QUEUE_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Crawl queue job failed',
        message: `Crawl job ${job.data.crawlRunId} failed: ${message}`,
        crawl_run_id: job.data.crawlRunId,
      });
      throw error;
    }
  }

  private async processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
    const { crawlRunId, jobLogId } = job.data;
    const { crawl_job_timeout_ms } =
      await this.platformConfigService.getCrawlerConfig();
    this.logger.log(`crawl job received: ${crawlRunId}`);

    if (!crawlRunId) {
      throw new Error(
        `crawl job ${job.id ?? '(no id)'} has no crawlRunId in its payload: ${JSON.stringify(job.data)}`,
      );
    }

    const run = await this.prisma.crawlRun.findUnique({
      where: { id: crawlRunId },
      include: {
        scraper: {
          include: { active_version: true },
        },
        website_target: {
          select: {
            block_rules: true,
            block_handling_wait_timeout_ms: true,
            block_handling_min_ready_body_length: true,
          },
        },
      },
    });

    if (!run) {
      this.logger.error(`crawl job ${crawlRunId}: run not found`);
      return;
    }

    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const isRetry = job.attemptsMade > 0;

    const reclaimableStatuses: CrawlRunStatus[] = isRetry
      ? [CrawlRunStatus.QUEUED, CrawlRunStatus.RUNNING, CrawlRunStatus.FAILED]
      : [CrawlRunStatus.QUEUED];

    if (!reclaimableStatuses.includes(run.status)) {
      this.logger.warn(
        `crawl job ${crawlRunId}: run is ${run.status}, not reclaimable on attempt ${attempt} — skipping`,
      );
      return;
    }

    const startedAt = new Date();
    const logId = await this.markJobActive(
      job,
      crawlRunId,
      jobLogId,
      attempt,
      startedAt,
    );

    const claimed = await this.prisma.crawlRun.updateMany({
      where: { id: crawlRunId, status: { in: reclaimableStatuses } },
      data: {
        status: CrawlRunStatus.RUNNING,
        started_at: startedAt,
        finished_at: null,
        error_message: null,
      },
    });

    if (claimed.count === 0) {
      this.logger.warn(
        `crawl job ${crawlRunId}: could not claim run — skipping`,
      );
      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: JobStatus.FAILED,
          finished_at: new Date(),
          error_message: 'Crawl run was cancelled before start',
        },
      });
      return;
    }

    try {
      const scraper = run.scraper;
      const activeVersion = scraper?.active_version;

      if (!scraper || !activeVersion?.config) {
        throw new Error(
          'Crawl run has no scraper with an active version config',
        );
      }

      const config = activeVersion.config as unknown as ScraperConfig;
      if (!config.start_url || !config.listing_selector) {
        throw new Error(
          'Active scraper config is missing start_url or listing_selector',
        );
      }

      const diagnosticsCtx: DiagnosticsRunContext = {
        crawlRunId,
        scraperId: scraper.id,
        scraperVersion: activeVersion.version,
        url: config.start_url,
        mode: scraper.diagnostics_mode,
        retryNumber: attempt - 1,
        workerId: job.id ? String(job.id) : undefined,
      };

      const heartbeat = async () => {
        await this.prisma.crawlRun.update({
          where: { id: crawlRunId },
          data: { updated_at: new Date() },
        });
      };

      const blockHandlingConfig = buildBlockHandlingConfig(run.website_target);

      const crawlResult = await this.withTimeout(
        this.crawlerService.runCrawl(
          config,
          diagnosticsCtx,
          { onPageComplete: heartbeat },
          blockHandlingConfig,
        ),
        crawl_job_timeout_ms,
        `crawl timed out after ${crawl_job_timeout_ms}ms`,
      );

      await this.withTimeout(
        this.detailEnrichmentService.enrichDetailPages(
          crawlResult.items,
          config.detail_page,
          {
            targetId: run.website_target_id,
            deadlineAt:
              Date.now() +
              crawl_job_timeout_ms -
              DETAIL_ENRICHMENT_SOFT_STOP_BUFFER_MS,
            onBatchComplete: heartbeat,
            blockHandlingConfig,
          },
        ),
        crawl_job_timeout_ms,
        `detail enrichment timed out after ${crawl_job_timeout_ms}ms`,
      );

      const seenUrls = new Set<string>();
      let totalCreated = 0;
      let totalUpdated = 0;
      const now = new Date();

      for (const item of crawlResult.items) {
        if (seenUrls.has(item.source_url)) continue;
        seenUrls.add(item.source_url);

        const raw = item.raw ?? {};
        const externalId = extractExternalId(item.source_url, raw);
        const hash = contentHash({
          url: item.source_url,
          raw,
        });

        const existing = await this.prisma.extractedItem.findUnique({
          where: {
            website_target_id_source_url: {
              website_target_id: run.website_target_id,
              source_url: item.source_url,
            },
          },
          select: { id: true },
        });

        await this.prisma.extractedItem.upsert({
          where: {
            website_target_id_source_url: {
              website_target_id: run.website_target_id,
              source_url: item.source_url,
            },
          },
          create: {
            website_target_id: run.website_target_id,
            crawl_run_id: crawlRunId,
            source_url: item.source_url,
            external_id: externalId,
            raw_data: raw as Prisma.InputJsonValue,
            content_hash: hash,
            first_seen_at: now,
            last_seen_at: now,
          },
          update: {
            crawl_run_id: crawlRunId,
            external_id: externalId,
            raw_data: raw as Prisma.InputJsonValue,
            content_hash: hash,
            last_seen_at: now,
          },
        });

        if (existing) totalUpdated++;
        else totalCreated++;
      }

      await this.prisma.scraperExecutionTrace.create({
        data: {
          scraper_id: scraper.id,
          crawl_run_id: crawlRunId,
          steps: crawlResult.steps as Prisma.InputJsonValue,
          success: crawlResult.success,
          error_summary: crawlResult.errorSummary ?? null,
        },
      });

      const finishedAt = new Date();
      const runFailed = !crawlResult.success;

      const finalized = await this.prisma.crawlRun.updateMany({
        where: { id: crawlRunId, status: CrawlRunStatus.RUNNING },
        data: {
          status: runFailed ? CrawlRunStatus.FAILED : CrawlRunStatus.SUCCESS,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          total_found: crawlResult.items.length,
          total_new_listings: totalCreated,
          total_refreshed_listings: totalUpdated,
          error_message: crawlResult.errorSummary ?? null,
        },
      });

      if (finalized.count === 0) {
        this.logger.warn(
          `crawl job ${crawlRunId}: run was cancelled — discarding result`,
        );
        await this.prisma.jobLog.update({
          where: { id: logId },
          data: {
            status: JobStatus.FAILED,
            finished_at: finishedAt,
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            error_message: 'Cancelled by admin',
          },
        });
        return;
      }

      if (runFailed) {
        this.notificationsService.create({
          type: NotificationType.LARGE_CRAWL_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Crawl run failed',
          message: crawlResult.errorSummary ?? 'Crawl failed',
          website_target_id: run.website_target_id,
          scraper_id: scraper.id,
          crawl_run_id: crawlRunId,
        });

        await this.scraperFailureHandler.handle({
          scraper,
          crawlRunId,
          websiteTargetId: run.website_target_id,
          zeroListingsPage0: crawlResult.zeroListingsPage0 ?? false,
          networkError: crawlResult.networkError ?? false,
          errorMessage: crawlResult.errorSummary ?? 'Crawl failed',
        });
      } else {
        await Promise.all([
          this.prisma.scraper.update({
            where: { id: scraper.id },
            data: {
              consecutive_failures: 0,
              last_success_at: finishedAt,
            },
          }),
          this.prisma.websiteTarget.update({
            where: { id: run.website_target_id },
            data: {
              last_success_at: finishedAt,
              last_error_message: null,
            },
          }),
        ]);
      }

      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: runFailed ? JobStatus.FAILED : JobStatus.COMPLETED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          result: {
            status: runFailed ? CrawlRunStatus.FAILED : CrawlRunStatus.SUCCESS,
            total_found: crawlResult.items.length,
            total_created: totalCreated,
            total_updated: totalUpdated,
          },
          error_message: runFailed ? crawlResult.errorSummary : null,
        },
      });

      return;
    } catch (error) {
      const finishedAt = new Date();
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      const currentRun = await this.prisma.crawlRun.findUnique({
        where: { id: crawlRunId },
        include: {
          scraper: true,
        },
      });

      if (currentRun?.status === CrawlRunStatus.CANCELLED) {
        await this.prisma.jobLog.update({
          where: { id: logId },
          data: {
            status: JobStatus.FAILED,
            finished_at: finishedAt,
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            error_message: 'Cancelled by admin',
          },
        });
        return;
      }

      const isFinalAttempt = attempt >= maxAttempts;

      let markedFailed = false;
      if (currentRun?.status === CrawlRunStatus.RUNNING) {
        if (isFinalAttempt) {
          await this.prisma.crawlRun.update({
            where: { id: crawlRunId },
            data: {
              status: CrawlRunStatus.FAILED,
              finished_at: finishedAt,
              duration_ms: finishedAt.getTime() - startedAt.getTime(),
              error_message: message,
            },
          });
          markedFailed = true;

          this.notificationsService.create({
            type: NotificationType.LARGE_CRAWL_FAILURE,
            severity: NotificationSeverity.CRITICAL,
            title: 'Crawl run failed',
            message,
            website_target_id: currentRun.website_target_id,
            scraper_id: currentRun.scraper_id ?? undefined,
            crawl_run_id: crawlRunId,
          });
        } else {
          this.logger.warn(
            `crawl job ${crawlRunId}: attempt ${attempt}/${maxAttempts} failed, will retry: ${message}`,
          );
          await this.prisma.crawlRun.update({
            where: { id: crawlRunId },
            data: {
              error_message: `Attempt ${attempt}/${maxAttempts} failed: ${message} -- retrying`,
            },
          });
        }
      }

      if (markedFailed && currentRun?.scraper) {
        await this.scraperFailureHandler.handle({
          scraper: currentRun.scraper,
          crawlRunId,
          websiteTargetId: currentRun.website_target_id,
          zeroListingsPage0: false,
          networkError: false,
          errorMessage: message,
        });
      }

      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: JobStatus.FAILED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          error_message: message,
          stack_trace: stack ?? null,
        },
      });

      throw error;
    }
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(timeoutMessage)),
        timeoutMs,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private async markJobActive(
    job: Job<CrawlJobData>,
    crawlRunId: string,
    jobLogId: string | undefined,
    attempt: number,
    startedAt: Date,
  ): Promise<string> {
    if (jobLogId) {
      await this.prisma.jobLog.update({
        where: { id: jobLogId },
        data: {
          status: JobStatus.ACTIVE,
          attempt,
          job_id: job.id ?? null,
          started_at: startedAt,
          finished_at: null,
          duration_ms: null,
          error_message: null,
          stack_trace: null,
        },
      });
      return jobLogId;
    }

    const jobLog = await this.prisma.jobLog.create({
      data: {
        queue_name: CRAWL_QUEUE,
        job_id: job.id ?? null,
        job_name: job.name ?? 'crawl',
        status: JobStatus.ACTIVE,
        attempt,
        max_attempts: job.opts.attempts ?? null,
        crawl_run_id: crawlRunId,
        payload: job.data as object,
        started_at: startedAt,
      },
    });

    return jobLog.id;
  }
}
