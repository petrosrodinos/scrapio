import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AI_BATCH_QUEUE, AI_BATCH_TIMEOUT_MS } from '@/core/queues/queues.constants';
import { IntegrationCredentialResolverService } from '@/integrations/credentials/services/integration-credential-resolver.service';
import { AiBatchOpenAiService } from '@/integrations/ai/services/ai-batch-openai.service';
import { AiBatchJobStatus, IntegrationType } from 'generated/prisma';

export interface AiBatchCompletionJobData {
  aiBatchJobId: string;
}

const OPEN_STATUSES: AiBatchJobStatus[] = [
  AiBatchJobStatus.SUBMITTED,
  AiBatchJobStatus.IN_PROGRESS,
];

const TERMINAL_STATUSES: AiBatchJobStatus[] = [
  AiBatchJobStatus.COMPLETED,
  AiBatchJobStatus.FAILED,
  AiBatchJobStatus.EXPIRED,
  AiBatchJobStatus.CANCELLED,
];

/**
 * Polls OpenAI for the status of every open AiBatchJob (see ExtractionService.submitStructuredBatch)
 * and, once a batch reaches a terminal OpenAI status, hands it off to AiBatchCompletionProcessor to
 * finalize the parked WorkflowRun. Mirrors CrawlRunWatchdogCron's pattern of a lightweight cron that
 * only marks state and enqueues — the actual result processing happens in a queue worker.
 */
@Injectable()
export class AiBatchPollCron {
  private readonly logger = new Logger(AiBatchPollCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialResolver: IntegrationCredentialResolverService,
    private readonly aiBatchOpenAiService: AiBatchOpenAiService,
    @InjectQueue(AI_BATCH_QUEUE)
    private readonly aiBatchQueue: Queue<AiBatchCompletionJobData>,
  ) {}

  @Cron('*/2 * * * *')
  async pollOpenBatches(): Promise<void> {
    const openJobs = await this.prisma.aiBatchJob.findMany({
      where: { status: { in: OPEN_STATUSES } },
    });

    for (const job of openJobs) {
      if (Date.now() - job.submitted_at.getTime() > AI_BATCH_TIMEOUT_MS) {
        await this.prisma.aiBatchJob.update({
          where: { id: job.id },
          data: {
            status: AiBatchJobStatus.FAILED,
            error_message: `Timed out waiting for OpenAI batch ${job.external_batch_id} to complete`,
            last_polled_at: new Date(),
            completed_at: new Date(),
          },
        });
        await this.aiBatchQueue.add('complete', { aiBatchJobId: job.id });
        this.logger.warn(
          `AI batch job ${job.id} timed out waiting for OpenAI batch ${job.external_batch_id}`,
        );
        continue;
      }

      try {
        const credentials = await this.credentialResolver.resolveApiKey({
          userId: job.user_id,
          integrationType: IntegrationType.OPENAI,
        });

        const result = await this.aiBatchOpenAiService.retrieveBatch(
          credentials.apiKey,
          job.external_batch_id,
        );

        const isTerminal = TERMINAL_STATUSES.includes(result.status);

        await this.prisma.aiBatchJob.update({
          where: { id: job.id },
          data: {
            status: result.status,
            output_file_id: result.outputFileId ?? undefined,
            error_file_id: result.errorFileId ?? undefined,
            last_polled_at: new Date(),
            ...(isTerminal && { completed_at: new Date() }),
            ...(isTerminal &&
              result.status !== AiBatchJobStatus.COMPLETED && {
                error_message: `OpenAI batch ${job.external_batch_id} reported status "${result.rawStatus}"`,
              }),
          },
        });

        if (isTerminal) {
          await this.aiBatchQueue.add('complete', { aiBatchJobId: job.id });
        }
      } catch (error) {
        this.logger.error(
          `Failed to poll OpenAI batch ${job.external_batch_id} for AI batch job ${job.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
