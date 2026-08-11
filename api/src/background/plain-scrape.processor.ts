import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { PLAIN_SCRAPE_QUEUE } from '@/core/queues/queues.constants';
import { HtmlFetcherService } from '@/modules/plain-scrape/services/html-fetcher.service';
import { ExtractionService } from '@/modules/extraction/extraction.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  ExtractionScope,
  JobStatus,
  NotificationSeverity,
  NotificationType,
  OutputFormat,
  Prisma,
  RunStatus,
} from 'generated/prisma';

interface PlainScrapeJobData {
  workflowRunId: string;
  jobLogId?: string;
}

const MAX_COMBINED_CONTENT_CHARS = 60_000;

@Processor(PLAIN_SCRAPE_QUEUE)
export class PlainScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(PlainScrapeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlFetcher: HtmlFetcherService,
    private readonly extractionService: ExtractionService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<PlainScrapeJobData>): Promise<void> {
    try {
      await this.processJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notificationsService.create({
        type: NotificationType.QUEUE_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Plain scrape queue job failed',
        message: `Plain scrape job ${job.data.workflowRunId} failed: ${message}`,
        workflow_run_id: job.data.workflowRunId,
      });
      throw error;
    }
  }

  private async processJob(job: Job<PlainScrapeJobData>): Promise<void> {
    const { workflowRunId, jobLogId } = job.data;

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: {
        workflow_config: true,
        extraction_schema_version: true,
      },
    });

    if (!run) {
      this.logger.error(`plain scrape job ${workflowRunId}: run not found`);
      return;
    }

    const attempt = job.attemptsMade + 1;
    const startedAt = new Date();
    const logId = await this.markJobActive(job, workflowRunId, jobLogId, attempt, startedAt);

    const claimed = await this.prisma.workflowRun.updateMany({
      where: { id: workflowRunId, status: RunStatus.QUEUED },
      data: { status: RunStatus.RUNNING, started_at: startedAt, finished_at: null, error_message: null },
    });

    if (claimed.count === 0 && job.attemptsMade === 0) {
      this.logger.warn(`plain scrape job ${workflowRunId}: could not claim run — skipping`);
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

    try {
      const urls = run.urls;
      const outputFormats = run.output_formats as OutputFormat[];
      const wantsExtraction = outputFormats.length > 0;
      const scope = run.extraction_scope ?? ExtractionScope.COMBINED;
      const schemaDefinition = run.extraction_schema_version?.definition as
        | Record<string, unknown>
        | null
        | undefined;

      const pages: { id: string; url: string; success: boolean; content: string | null }[] = [];

      for (const url of urls) {
        const currentRun = await this.prisma.workflowRun.findUnique({
          where: { id: workflowRunId },
          select: { status: true },
        });
        if (currentRun?.status === RunStatus.CANCELLED) {
          this.logger.log(`plain scrape job ${workflowRunId}: cancelled mid-run`);
          break;
        }

        const fetched = await this.htmlFetcher.fetch(url);
        const page = await this.prisma.plainScrapedPage.create({
          data: {
            workflow_run_id: workflowRunId,
            requested_url: url,
            final_url: fetched.finalUrl,
            http_status: fetched.httpStatus,
            success: fetched.success,
            raw_html: fetched.rawHtml,
            cleaned_content: fetched.cleanedContent,
            title: fetched.title,
            metadata: (fetched.metadata as Prisma.InputJsonValue) ?? undefined,
            error_message: fetched.errorMessage,
          },
        });

        const content = fetched.cleanedContent ?? fetched.rawHtml;
        pages.push({ id: page.id, url, success: fetched.success, content });

        if (wantsExtraction && scope === ExtractionScope.PER_URL && fetched.success && content) {
          const outcome = await this.extractionService.extract({
            userId: run.user_id,
            outputFormats,
            content,
            contentLabel: `HTML content of ${url}`,
            instructions: run.workflow_config?.description,
            schemaDefinition,
            sourceUrl: url,
          });

          await this.extractionService.persist(outcome, {
            plainScrapedPageId: page.id,
            extractionSchemaVersionId: run.extraction_schema_version_id,
          });
        }
      }

      if (wantsExtraction && scope === ExtractionScope.COMBINED) {
        const successfulPages = pages.filter((p) => p.success && p.content);

        if (successfulPages.length > 0) {
          const combinedContent = successfulPages
            .map((p) => `=== SOURCE: ${p.url} ===\n${p.content}`)
            .join('\n\n')
            .slice(0, MAX_COMBINED_CONTENT_CHARS);

          const outcome = await this.extractionService.extract({
            userId: run.user_id,
            outputFormats,
            content: combinedContent,
            contentLabel: `combined HTML content of ${successfulPages.length} page(s)`,
            instructions: run.workflow_config?.description,
            schemaDefinition,
            sourceUrl: successfulPages[0]?.url,
          });

          await this.extractionService.persist(outcome, {
            workflowRunId,
            extractionSchemaVersionId: run.extraction_schema_version_id,
          });
        }
      }

      const finishedAt = new Date();
      const anySuccess = pages.some((p) => p.success);
      const allFailed = pages.length > 0 && !anySuccess;

      const finalized = await this.prisma.workflowRun.updateMany({
        where: { id: workflowRunId, status: RunStatus.RUNNING },
        data: {
          status: allFailed ? RunStatus.FAILED : RunStatus.SUCCESS,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          error_message: allFailed ? 'All URLs failed to fetch' : null,
        },
      });

      if (finalized.count === 0) {
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

      if (allFailed) {
        this.notificationsService.create({
          type: NotificationType.PLAIN_SCRAPE_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Plain scrape run failed',
          message: 'All URLs failed to fetch',
          workflow_config_id: run.workflow_config_id,
          workflow_run_id: workflowRunId,
        });
      }

      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status: allFailed ? JobStatus.FAILED : JobStatus.COMPLETED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          result: {
            total_urls: urls.length,
            successful: pages.filter((p) => p.success).length,
          },
          error_message: allFailed ? 'All URLs failed to fetch' : null,
        },
      });
    } catch (error) {
      const finishedAt = new Date();
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      const currentRun = await this.prisma.workflowRun.findUnique({
        where: { id: workflowRunId },
        select: { status: true },
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

      if (currentRun?.status === RunStatus.RUNNING) {
        await this.prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: RunStatus.FAILED,
            finished_at: finishedAt,
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            error_message: message,
          },
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

  private async markJobActive(
    job: Job<PlainScrapeJobData>,
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
        queue_name: PLAIN_SCRAPE_QUEUE,
        job_id: job.id ?? null,
        job_name: job.name ?? 'plain-scrape',
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
