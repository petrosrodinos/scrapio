import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { BROWSER_AGENT_QUEUE } from '@/core/queues/queues.constants';
import { BrowserAgentOrchestratorService } from '@/integrations/computer-use/browser-agent-orchestrator.service';
import { ExtractionService } from '@/modules/extraction/extraction.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import {
  ExtractionFormatStatus,
  JobStatus,
  NotificationSeverity,
  NotificationType,
  OutputFormat,
  Prisma,
  RunStatus,
} from 'generated/prisma';
import { ExtractionOutcome } from '@/modules/extraction/interfaces/extraction.interface';

interface BrowserAgentJobData {
  workflowRunId: string;
  jobLogId?: string;
}

@Processor(BROWSER_AGENT_QUEUE)
export class BrowserAgentProcessor extends WorkerHost {
  private readonly logger = new Logger(BrowserAgentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: BrowserAgentOrchestratorService,
    private readonly extractionService: ExtractionService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<BrowserAgentJobData>): Promise<void> {
    try {
      await this.processJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notificationsService.create({
        type: NotificationType.QUEUE_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Browser agent queue job failed',
        message: `Browser agent job ${job.data.workflowRunId} failed: ${message}`,
        workflow_run_id: job.data.workflowRunId,
      });
      throw error;
    }
  }

  private async processJob(job: Job<BrowserAgentJobData>): Promise<void> {
    const { workflowRunId, jobLogId } = job.data;

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
    });

    if (!run) {
      this.logger.error(`browser agent job ${workflowRunId}: run not found`);
      return;
    }

    const attempt = job.attemptsMade + 1;
    const startedAt = new Date();
    const logId = await this.markJobActive(
      job,
      workflowRunId,
      jobLogId,
      attempt,
      startedAt,
    );

    const claimed = await this.prisma.workflowRun.updateMany({
      where: { id: workflowRunId, status: RunStatus.QUEUED },
      data: {
        status: RunStatus.RUNNING,
        started_at: startedAt,
        finished_at: null,
        error_message: null,
      },
    });

    if (claimed.count === 0 && job.attemptsMade === 0) {
      this.logger.warn(
        `browser agent job ${workflowRunId}: could not claim run — skipping`,
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

    try {
      const outcome = await this.orchestrator.run(workflowRunId);

      await this.prisma.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          visited_urls: outcome.visitedUrls as Prisma.InputJsonValue,
          browser_actions: outcome.browserActions as unknown as Prisma.InputJsonValue,
          collected_data: (outcome.findings ??
            Prisma.JsonNull) as Prisma.InputJsonValue,
          ai_usage: outcome.aiUsage as unknown as Prisma.InputJsonValue,
        },
      });

      if (outcome.cancelled) {
        this.logger.log(`browser agent job ${workflowRunId}: cancelled mid-run`);
        await this.prisma.jobLog.update({
          where: { id: logId },
          data: {
            status: JobStatus.FAILED,
            finished_at: new Date(),
            error_message: 'Cancelled by admin',
          },
        });
        return;
      }

      if (!outcome.findings || outcome.failureReason) {
        const finishedAt = new Date();
        const errorMessage =
          outcome.failureReason ?? 'Browser agent run produced no findings';

        await this.prisma.workflowRun.updateMany({
          where: { id: workflowRunId, status: RunStatus.RUNNING },
          data: {
            status: RunStatus.FAILED,
            finished_at: finishedAt,
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            error_message: errorMessage,
          },
        });

        this.notificationsService.create({
          type: NotificationType.BROWSER_AGENT_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Browser agent run failed',
          message: errorMessage,
          workflow_config_id: run.workflow_config_id,
          workflow_run_id: workflowRunId,
        });

        await this.prisma.jobLog.update({
          where: { id: logId },
          data: {
            status: JobStatus.FAILED,
            finished_at: finishedAt,
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            error_message: errorMessage,
          },
        });
        return;
      }

      const outputFormats = run.output_formats as OutputFormat[];
      const schemaVersion = run.extraction_schema_version_id
        ? await this.prisma.extractionSchemaVersion.findUnique({
            where: { id: run.extraction_schema_version_id },
          })
        : null;

      const extractionOutcome = await this.extractionService.extract({
        userId: run.user_id,
        outputFormats,
        content: JSON.stringify(outcome.findings, null, 2),
        contentLabel: `browser agent findings for ${run.url}`,
        instructions: null,
        schemaDefinition: schemaVersion?.definition as
          | Record<string, unknown>
          | null
          | undefined,
        sourceUrl: run.url,
      });

      await this.extractionService.persist(extractionOutcome, {
        workflowRunId,
        extractionSchemaVersionId: run.extraction_schema_version_id,
      });

      const finishedAt = new Date();
      const runStatus = this.deriveRunStatus(extractionOutcome, outputFormats);

      const finalized = await this.prisma.workflowRun.updateMany({
        where: { id: workflowRunId, status: RunStatus.RUNNING },
        data: {
          status: runStatus,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          error_message:
            runStatus === RunStatus.FAILED
              ? 'Extraction did not produce a valid result'
              : null,
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

      if (runStatus === RunStatus.FAILED) {
        this.notificationsService.create({
          type: NotificationType.BROWSER_AGENT_FAILURE,
          severity: NotificationSeverity.CRITICAL,
          title: 'Browser agent extraction failed',
          message: 'Extraction did not produce a valid result',
          workflow_config_id: run.workflow_config_id,
          workflow_run_id: workflowRunId,
        });
      }

      await this.prisma.jobLog.update({
        where: { id: logId },
        data: {
          status:
            runStatus === RunStatus.FAILED
              ? JobStatus.FAILED
              : JobStatus.COMPLETED,
          finished_at: finishedAt,
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
          result: {
            visited_urls: outcome.visitedUrls.length,
            steps: outcome.browserActions.length,
          },
          error_message:
            runStatus === RunStatus.FAILED
              ? 'Extraction did not produce a valid result'
              : null,
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

  private async markJobActive(
    job: Job<BrowserAgentJobData>,
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
        queue_name: BROWSER_AGENT_QUEUE,
        job_id: job.id ?? null,
        job_name: job.name ?? 'browser-agent',
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
