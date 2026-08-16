import { Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { WORKFLOW_RUN_STATUS_CHANGED_EVENT } from '@/shared/interfaces/workflow-run-status-changed.event';
import { ExtractionService } from '@/modules/extraction/extraction.service';
import { ExtractionOutcome } from '@/modules/extraction/interfaces/extraction.interface';
import {
  ExtractionFormatStatus,
  JobStatus,
  NotificationSeverity,
  NotificationType,
  OutputFormat,
  Prisma,
  RunStatus,
} from 'generated/prisma';

const MAX_COMBINED_CONTENT_CHARS = 60_000;

interface CrawlJobData {
  workflowRunId: string;
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
    private readonly eventEmitter: EventEmitter2,
    private readonly platformConfigService: PlatformConfigService,
    private readonly extractionService: ExtractionService,
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
        message: `Crawl job ${job.data.workflowRunId} failed: ${message}`,
        workflow_run_id: job.data.workflowRunId,
      });
      throw error;
    }
  }

  private async processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
    const { workflowRunId, jobLogId } = job.data;
    const { crawl_job_timeout_ms } =
      await this.platformConfigService.getCrawlerConfig();
    this.logger.log(`crawl job received: ${workflowRunId}`);

    if (!workflowRunId) {
      throw new Error(
        `crawl job ${job.id ?? '(no id)'} has no workflowRunId in its payload: ${JSON.stringify(job.data)}`,
      );
    }

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: {
        workflow_config: {
          include: { active_version: true },
        },
        extraction_schema_version: true,
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
      this.logger.error(`crawl job ${workflowRunId}: run not found`);
      return;
    }

    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const isRetry = job.attemptsMade > 0;

    const reclaimableStatuses: RunStatus[] = isRetry
      ? [RunStatus.QUEUED, RunStatus.RUNNING, RunStatus.FAILED]
      : [RunStatus.QUEUED];

    if (!reclaimableStatuses.includes(run.status)) {
      this.logger.warn(
        `crawl job ${workflowRunId}: run is ${run.status}, not reclaimable on attempt ${attempt} — skipping`,
      );
      return;
    }

    const startedAt = new Date();
    const logId = await this.markJobActive(
      job,
      workflowRunId,
      jobLogId,
      attempt,
      startedAt,
    );

    const claimed = await this.prisma.workflowRun.updateMany({
      where: { id: workflowRunId, status: { in: reclaimableStatuses } },
      data: {
        status: RunStatus.RUNNING,
        started_at: startedAt,
        finished_at: null,
        error_message: null,
      },
    });

    if (claimed.count === 0) {
      this.logger.warn(
        `crawl job ${workflowRunId}: could not claim run — skipping`,
      );
      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: JobStatus.FAILED,
          finished_at: new Date(),
          error_message: 'Workflow run was cancelled before start',
        },
      });
      return;
    }

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status: RunStatus.RUNNING,
      persistResults: run.persist_results,
      startedAt,
    });

    try {
      const workflowConfig = run.workflow_config;
      const activeVersion = workflowConfig?.active_version;

      if (!workflowConfig || !activeVersion?.config) {
        throw new Error(
          'Workflow run has no config with an active version',
        );
      }

      const config = activeVersion.config as unknown as ScraperConfig;
      if (!config.start_url || !config.listing_selector) {
        throw new Error(
          'Active scraper config is missing start_url or listing_selector',
        );
      }

      const diagnosticsCtx: DiagnosticsRunContext = {
        workflowRunId,
        workflowConfigId: workflowConfig.id,
        scraperVersion: activeVersion.version,
        url: config.start_url,
        mode: workflowConfig.diagnostics_mode ?? 'PRODUCTION',
        retryNumber: attempt - 1,
        workerId: job.id ? String(job.id) : undefined,
      };

      const heartbeat = async () => {
        await this.prisma.workflowRun.update({
          where: { id: workflowRunId },
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
            targetId: run.website_target_id!,
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

        // Forget-mode runs (persist_results: false) skip ExtractedItem entirely — its whole
        // purpose is durable per-website_target dedup tracking across runs, the opposite of
        // scrape-and-forget semantics.
        if (!run.persist_results) {
          totalCreated++;
          continue;
        }

        const existing = await this.prisma.extractedItem.findUnique({
          where: {
            website_target_id_source_url: {
              website_target_id: run.website_target_id!,
              source_url: item.source_url,
            },
          },
          select: { id: true },
        });

        await this.prisma.extractedItem.upsert({
          where: {
            website_target_id_source_url: {
              website_target_id: run.website_target_id!,
              source_url: item.source_url,
            },
          },
          create: {
            website_target_id: run.website_target_id!,
            workflow_run_id: workflowRunId,
            source_url: item.source_url,
            external_id: externalId,
            raw_data: raw as Prisma.InputJsonValue,
            content_hash: hash,
            first_seen_at: now,
            last_seen_at: now,
          },
          update: {
            workflow_run_id: workflowRunId,
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
          workflow_config_id: workflowConfig.id,
          workflow_run_id: workflowRunId,
          steps: crawlResult.steps as Prisma.InputJsonValue,
          success: crawlResult.success,
          error_summary: crawlResult.errorSummary ?? null,
        },
      });

      const runFailed = !crawlResult.success;
      const outputFormats = run.output_formats as OutputFormat[];
      const schemaDefinition = run.extraction_schema_version?.definition as
        | Record<string, unknown>
        | null
        | undefined;
      const wantsAiBatch =
        run.ai_batch_mode &&
        outputFormats.includes(OutputFormat.STRUCTURED_JSON) &&
        !!schemaDefinition;

      if (!runFailed && wantsAiBatch && crawlResult.items.length > 0) {
        const combinedContent = crawlResult.items
          .map((item) => `=== SOURCE: ${item.source_url} ===\n${JSON.stringify(item.raw ?? {})}`)
          .join('\n\n')
          .slice(0, MAX_COMBINED_CONTENT_CHARS);

        await this.extractionService.submitStructuredBatch(
          [
            {
              content: combinedContent,
              contentLabel: `${crawlResult.items.length} extracted item(s) from ${config.start_url}`,
              instructions: activeVersion.generation_prompt,
              sourceUrl: config.start_url,
              wantsMarkdown: outputFormats.includes(OutputFormat.MARKDOWN),
            },
          ],
          { workflowRunId, userId: run.user_id, schemaDefinition },
        );

        await this.prisma.workflowRun.updateMany({
          where: { id: workflowRunId, status: RunStatus.RUNNING },
          data: { status: RunStatus.AWAITING_AI_BATCH },
        });

        this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
          workflowRunId,
          userId: run.user_id,
          workflowConfigId: workflowConfig.id,
          type: run.type,
          status: RunStatus.AWAITING_AI_BATCH,
          persistResults: run.persist_results,
          startedAt,
        });

        // Leave the JobLog ACTIVE (not COMPLETED/FAILED) — AiBatchCompletionProcessor closes it
        // once the batch resolves, mirroring "the job is still working, just off-process."
        return;
      }

      let extractionOutcome: ExtractionOutcome | null = null;
      if (!runFailed && outputFormats.length > 0 && crawlResult.items.length > 0) {
        const combinedContent = crawlResult.items
          .map((item) => `=== SOURCE: ${item.source_url} ===\n${JSON.stringify(item.raw ?? {})}`)
          .join('\n\n')
          .slice(0, MAX_COMBINED_CONTENT_CHARS);

        extractionOutcome = await this.extractionService.extract({
          userId: run.user_id,
          outputFormats,
          content: combinedContent,
          contentLabel: `${crawlResult.items.length} extracted item(s) from ${config.start_url}`,
          instructions: activeVersion.generation_prompt,
          schemaDefinition: run.extraction_schema_version?.definition as
            | Record<string, unknown>
            | null
            | undefined,
          sourceUrl: config.start_url,
        });

        await this.extractionService.persist(extractionOutcome, {
          workflowRunId,
          extractionSchemaVersionId: run.extraction_schema_version_id,
        });
      }

      const finishedAt = new Date();
      const extractionFailed = extractionOutcome
        ? this.deriveExtractionFailed(extractionOutcome, outputFormats)
        : false;
      const runStatus = runFailed
        ? RunStatus.FAILED
        : extractionOutcome
          ? this.deriveRunStatus(extractionOutcome, outputFormats)
          : RunStatus.SUCCESS;
      const errorMessage = runFailed
        ? (crawlResult.errorSummary ?? null)
        : extractionFailed
          ? 'Extraction did not produce a valid result'
          : null;

      const finalized = await this.prisma.workflowRun.updateMany({
        where: { id: workflowRunId, status: RunStatus.RUNNING },
        data: {
          status: runStatus,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          error_message: errorMessage,
        },
      });

      if (finalized.count === 0) {
        this.logger.warn(
          `crawl job ${workflowRunId}: run was cancelled — discarding result`,
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

      this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
        workflowRunId,
        userId: run.user_id,
        workflowConfigId: workflowConfig.id,
        type: run.type,
        status: runStatus,
        persistResults: run.persist_results,
        errorMessage,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });

      if (runFailed) {
        this.notificationsService.create({
          type: NotificationType.LARGE_CRAWL_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Crawl run failed',
          message: crawlResult.errorSummary ?? 'Crawl failed',
          website_target_id: run.website_target_id ?? undefined,
          workflow_config_id: workflowConfig.id,
          workflow_run_id: workflowRunId,
        });

        await this.scraperFailureHandler.handle({
          workflowConfig,
          workflowRunId,
          websiteTargetId: run.website_target_id!,
          zeroListingsPage0: crawlResult.zeroListingsPage0 ?? false,
          networkError: crawlResult.networkError ?? false,
          errorMessage: crawlResult.errorSummary ?? 'Crawl failed',
        });
      } else {
        await Promise.all([
          this.prisma.workflowConfig.update({
            where: { id: workflowConfig.id },
            data: {
              consecutive_failures: 0,
              last_success_at: finishedAt,
            },
          }),
          this.prisma.websiteTarget.update({
            where: { id: run.website_target_id! },
            data: {
              last_success_at: finishedAt,
              last_error_message: null,
            },
          }),
        ]);
      }

      if (!runFailed && extractionFailed) {
        this.notificationsService.create({
          type: NotificationType.LARGE_CRAWL_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Scraper extraction failed',
          message: 'Extraction did not produce a valid result',
          website_target_id: run.website_target_id ?? undefined,
          workflow_config_id: workflowConfig.id,
          workflow_run_id: workflowRunId,
        });
      }

      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status:
            runStatus === RunStatus.FAILED ? JobStatus.FAILED : JobStatus.COMPLETED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          result: {
            status: runStatus,
            total_found: crawlResult.items.length,
            total_created: totalCreated,
            total_updated: totalUpdated,
          },
          error_message: errorMessage,
        },
      });

      return;
    } catch (error) {
      const finishedAt = new Date();
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      const currentRun = await this.prisma.workflowRun.findUnique({
        where: { id: workflowRunId },
        include: {
          workflow_config: true,
        },
      });

      if (currentRun?.status === RunStatus.CANCELLED) {
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
      if (currentRun?.status === RunStatus.RUNNING) {
        if (isFinalAttempt) {
          await this.prisma.workflowRun.update({
            where: { id: workflowRunId },
            data: {
              status: RunStatus.FAILED,
              finished_at: finishedAt,
              duration_ms: finishedAt.getTime() - startedAt.getTime(),
              error_message: message,
            },
          });
          markedFailed = true;

          this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
            workflowRunId,
            userId: run.user_id,
            workflowConfigId: currentRun.workflow_config_id,
            type: run.type,
            status: RunStatus.FAILED,
            persistResults: run.persist_results,
            errorMessage: message,
            startedAt,
            finishedAt,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          });

          this.notificationsService.create({
            type: NotificationType.LARGE_CRAWL_FAILURE,
            severity: NotificationSeverity.CRITICAL,
            title: 'Crawl run failed',
            message,
            website_target_id: currentRun.website_target_id ?? undefined,
            workflow_config_id: currentRun.workflow_config_id,
            workflow_run_id: workflowRunId,
          });
        } else {
          this.logger.warn(
            `crawl job ${workflowRunId}: attempt ${attempt}/${maxAttempts} failed, will retry: ${message}`,
          );
          await this.prisma.workflowRun.update({
            where: { id: workflowRunId },
            data: {
              error_message: `Attempt ${attempt}/${maxAttempts} failed: ${message} -- retrying`,
            },
          });
        }
      }

      if (markedFailed && currentRun?.workflow_config) {
        await this.scraperFailureHandler.handle({
          workflowConfig: currentRun.workflow_config,
          workflowRunId,
          websiteTargetId: currentRun.website_target_id!,
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

  private deriveRunStatus(
    outcome: ExtractionOutcome,
    outputFormats: OutputFormat[],
  ): RunStatus {
    const wantsStructured = outputFormats.includes(OutputFormat.STRUCTURED_JSON);
    const wantsMarkdown = outputFormats.includes(OutputFormat.MARKDOWN);

    const structuredOk =
      !wantsStructured || outcome.structured_status === ExtractionFormatStatus.VALID;
    const markdownOk =
      !wantsMarkdown || outcome.markdown_status === ExtractionFormatStatus.VALID;

    if (structuredOk && markdownOk) {
      return RunStatus.SUCCESS;
    }
    if (structuredOk || markdownOk) {
      return RunStatus.PARTIAL_SUCCESS;
    }
    return RunStatus.FAILED;
  }

  private deriveExtractionFailed(
    outcome: ExtractionOutcome,
    outputFormats: OutputFormat[],
  ): boolean {
    return this.deriveRunStatus(outcome, outputFormats) !== RunStatus.SUCCESS;
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
    workflowRunId: string,
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
        workflow_run_id: workflowRunId,
        payload: job.data as object,
        started_at: startedAt,
      },
    });

    return jobLog.id;
  }
}
