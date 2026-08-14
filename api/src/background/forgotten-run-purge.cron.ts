import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { WorkflowRunPurgeService } from '@/modules/crawl-runs/services/workflow-run-purge.service';
import { TERMINAL_RUN_STATUSES } from '@/modules/webhooks/constants/webhook-event-catalog.constant';

// Safety net for forget-mode runs that never got a confirmed webhook delivery — e.g. no
// endpoint is subscribed to the run's terminal event, or delivery kept failing. Without this,
// such runs would keep their result payload forever, defeating persist_results: false.
const FORGOTTEN_RUN_RETENTION_HOURS = 48;

@Injectable()
export class ForgottenRunPurgeCron {
  private readonly logger = new Logger(ForgottenRunPurgeCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly purgeService: WorkflowRunPurgeService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeStaleForgottenRuns(): Promise<void> {
    const staleBefore = new Date(
      Date.now() - FORGOTTEN_RUN_RETENTION_HOURS * 60 * 60_000,
    );

    const staleRuns = await this.prisma.workflowRun.findMany({
      where: {
        persist_results: false,
        results_purged_at: null,
        status: { in: TERMINAL_RUN_STATUSES },
        finished_at: { lt: staleBefore },
      },
      select: { id: true },
    });

    if (staleRuns.length === 0) return;

    for (const run of staleRuns) {
      await this.purgeService.purgeIfForgettable(run.id);
    }

    this.logger.log(
      `fallback-purged ${staleRuns.length} forgotten workflow run(s) past ${FORGOTTEN_RUN_RETENTION_HOURS}h retention`,
    );
  }
}
