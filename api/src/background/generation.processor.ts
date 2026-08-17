import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ComputerUseOrchestratorService } from '@/integrations/computer-use/computer-use-orchestrator.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { GENERATION_QUEUE } from '@/core/queues/queues.constants';
import { GENERATION_JOB_LOCK_DURATION_MS } from '@/integrations/computer-use/constants/generation.constants';
import {
  GenerationRunStatus,
  NotificationSeverity,
  NotificationType,
} from 'generated/prisma';

interface GenerationJobData {
  runId: string;
  resume?: boolean;
  retryError?: string;
  retryPrompt?: string;
}

@Processor(GENERATION_QUEUE, { lockDuration: GENERATION_JOB_LOCK_DURATION_MS })
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: ComputerUseOrchestratorService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<GenerationJobData>): Promise<void> {
    try {
      await this.processGenerationJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const run = await this.prisma.scraperGenerationRun.findUnique({
        where: { id: job.data.runId },
        include: { website_target: { select: { user_id: true } } },
      });

      this.notificationsService.create({
        type: NotificationType.QUEUE_FAILURE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Generation queue job failed',
        message: `Generation job ${job.data.runId} failed: ${message}`,
        website_target_id: run?.website_target_id,
        workflow_config_id: run?.workflow_config_id ?? undefined,
        user_id: run?.website_target.user_id,
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<GenerationJobData> | undefined,
    error: Error,
  ): Promise<void> {
    const runId = job?.data?.runId ?? job?.id;
    if (!runId || typeof runId !== 'string') {
      this.logger.error(
        `generation job failed without runId: ${error.message}`,
      );
      return;
    }

    if (job) {
      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade < maxAttempts) {
        return;
      }
    }

    await this.failRunIfActive(
      runId,
      error.message || 'Generation queue job failed',
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`generation job stalled: ${jobId}`);
  }

  private async processGenerationJob(
    job: Job<GenerationJobData>,
  ): Promise<void> {
    const { runId } = job.data;
    this.logger.log(`generation job received: ${runId}`);

    const run = await this.prisma.scraperGenerationRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      this.logger.error(`generation job ${runId}: run not found`);
      return;
    }

    if (
      run.status === GenerationRunStatus.SUCCESS ||
      run.status === GenerationRunStatus.FAILED ||
      run.status === GenerationRunStatus.CANCELLED ||
      run.status === GenerationRunStatus.AWAITING_REVIEW ||
      run.status === GenerationRunStatus.DRAFT
    ) {
      this.logger.warn(
        `generation job ${runId}: run is ${run.status} — skipping`,
      );
      return;
    }

    const resume =
      job.data.resume === true || run.status === GenerationRunStatus.RUNNING;

    if (run.status === GenerationRunStatus.RUNNING) {
      this.logger.warn(
        `generation job ${runId}: resuming stalled RUNNING run`,
      );
    }

    try {
      await this.orchestrator.run(runId, {
        resume,
        retryError: job.data.retryError,
        retryPrompt: job.data.retryPrompt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `generation job ${runId} crashed outside the orchestrator: ${message}`,
      );
      await this.failRunIfActive(runId, message);
      throw error;
    }
  }

  private async failRunIfActive(
    runId: string,
    errorMessage: string,
  ): Promise<void> {
    const finishedAt = new Date();
    const run = await this.prisma.scraperGenerationRun.findUnique({
      where: { id: runId },
      select: { started_at: true, status: true },
    });

    if (
      !run ||
      (run.status !== GenerationRunStatus.RUNNING &&
        run.status !== GenerationRunStatus.QUEUED)
    ) {
      return;
    }

    const updated = await this.prisma.scraperGenerationRun.updateMany({
      where: {
        id: runId,
        status: {
          in: [GenerationRunStatus.RUNNING, GenerationRunStatus.QUEUED],
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

    if (updated.count > 0) {
      this.logger.warn(
        `generation job ${runId}: marked FAILED after queue failure`,
      );
    }
  }
}
