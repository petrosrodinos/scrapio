import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AI_BATCH_QUEUE } from '@/core/queues/queues.constants';
import { ExtractionService } from '@/modules/extraction/extraction.service';
import { WORKFLOW_RUN_STATUS_CHANGED_EVENT } from '@/shared/interfaces/workflow-run-status-changed.event';
import { AiBatchJobStatus, JobStatus, OutputFormat, RunStatus, WorkflowRun } from 'generated/prisma';
import { AiBatchCompletionJobData } from './ai-batch-poll.cron';

/**
 * Finalizes a WorkflowRun once its AiBatchJob (see ExtractionService.submitStructuredBatch) has
 * reached a terminal OpenAI status — enqueued by AiBatchPollCron. This is where the run leaves
 * AWAITING_AI_BATCH: persisting results and moving the run to SUCCESS/PARTIAL_SUCCESS/FAILED here
 * emits WORKFLOW_RUN_STATUS_CHANGED_EVENT, which is what makes WebhooksEventListenerService fire
 * the real completion webhook at batch-completion time instead of at scrape-completion time.
 */
@Processor(AI_BATCH_QUEUE)
export class AiBatchCompletionProcessor extends WorkerHost {
  private readonly logger = new Logger(AiBatchCompletionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: ExtractionService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<AiBatchCompletionJobData>): Promise<void> {
    const { aiBatchJobId } = job.data;

    const aiBatchJob = await this.prisma.aiBatchJob.findUnique({
      where: { id: aiBatchJobId },
      include: { workflow_run: true },
    });

    if (!aiBatchJob) {
      this.logger.error(`ai batch completion job ${aiBatchJobId}: batch job not found`);
      return;
    }

    const run = aiBatchJob.workflow_run;
    if (run.status !== RunStatus.AWAITING_AI_BATCH) {
      this.logger.warn(
        `ai batch completion job ${aiBatchJobId}: run ${run.id} is ${run.status}, not AWAITING_AI_BATCH — skipping`,
      );
      return;
    }

    const startedAt = run.started_at ?? aiBatchJob.submitted_at;

    if (aiBatchJob.status === AiBatchJobStatus.COMPLETED) {
      const { items } = await this.extractionService.completeBatch(aiBatchJob.id);
      const outputFormats = run.output_formats as OutputFormat[];
      const statuses = items.map(({ outcome }) =>
        this.extractionService.deriveRunStatus(outcome, outputFormats),
      );
      const runStatus = this.aggregateRunStatus(statuses);
      const errorMessage =
        runStatus === RunStatus.FAILED
          ? 'AI batch extraction did not produce a valid result'
          : null;

      await this.finalizeRun(run, runStatus, startedAt, errorMessage);
    } else {
      const errorMessage =
        aiBatchJob.error_message ??
        `OpenAI batch ${aiBatchJob.external_batch_id} did not complete successfully`;

      await this.finalizeRun(run, RunStatus.FAILED, startedAt, errorMessage);
    }
  }

  private aggregateRunStatus(statuses: RunStatus[]): RunStatus {
    if (statuses.length === 0) return RunStatus.FAILED;
    if (statuses.every((status) => status === RunStatus.SUCCESS)) return RunStatus.SUCCESS;
    if (statuses.every((status) => status === RunStatus.FAILED)) return RunStatus.FAILED;
    return RunStatus.PARTIAL_SUCCESS;
  }

  private async finalizeRun(
    run: WorkflowRun,
    status: RunStatus,
    startedAt: Date,
    errorMessage: string | null,
  ): Promise<void> {
    const finishedAt = new Date();

    const finalized = await this.prisma.workflowRun.updateMany({
      where: { id: run.id, status: RunStatus.AWAITING_AI_BATCH },
      data: {
        status,
        finished_at: finishedAt,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        error_message: errorMessage,
      },
    });

    if (finalized.count === 0) {
      this.logger.warn(`ai batch completion: run ${run.id} was no longer AWAITING_AI_BATCH — skipping finalize`);
      return;
    }

    await this.prisma.jobLog.updateMany({
      where: { workflow_run_id: run.id, status: JobStatus.ACTIVE },
      data: {
        status: status === RunStatus.FAILED ? JobStatus.FAILED : JobStatus.COMPLETED,
        finished_at: finishedAt,
        error_message: errorMessage,
      },
    });

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId: run.id,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status,
      persistResults: run.persist_results,
      errorMessage,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });
  }
}
