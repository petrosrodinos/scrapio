import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Prisma } from 'generated/prisma';

@Injectable()
export class WorkflowRunPurgeService {
  private readonly logger = new Logger(WorkflowRunPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Deletes a forget-mode run's result payload, keeping only lightweight metadata
  // (status/timestamps/error/per-page success flags/extraction status flags) so run history
  // and failure logs stay browsable. Idempotent — safe to call from multiple confirmed
  // webhook deliveries and from the fallback retention cron.
  async purgeIfForgettable(workflowRunId: string): Promise<void> {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      select: { id: true, persist_results: true, results_purged_at: true },
    });

    if (!run || run.persist_results || run.results_purged_at) {
      return;
    }

    const claimed = await this.prisma.workflowRun.updateMany({
      where: { id: workflowRunId, results_purged_at: null },
      data: { results_purged_at: new Date(), collected_data: Prisma.JsonNull },
    });

    if (claimed.count === 0) {
      return;
    }

    await this.prisma.plainScrapedPage.updateMany({
      where: { workflow_run_id: workflowRunId },
      data: { raw_html: null, cleaned_content: null },
    });

    await this.prisma.extractionResult.updateMany({
      where: {
        OR: [
          { workflow_run_id: workflowRunId },
          { plain_scraped_page: { workflow_run_id: workflowRunId } },
        ],
      },
      data: {
        structured_data: Prisma.JsonNull,
        structured_raw_ai_output: Prisma.JsonNull,
        markdown: null,
      },
    });

    this.logger.log(`purged forget-mode results for workflow run ${workflowRunId}`);
  }
}
