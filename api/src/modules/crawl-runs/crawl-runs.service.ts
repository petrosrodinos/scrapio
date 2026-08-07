import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CRAWL_QUEUE } from '@/core/queues/queues.constants';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { workflowRunUserWhere } from '@/shared/utils/user/user-scope.utils';
import {
  DEFAULT_CRAWL_JOB_ATTEMPTS,
  DEFAULT_CRAWL_JOB_BACKOFF_MS,
} from '@/integrations/crawler/constants/crawler.constants';
import { JobStatus, Prisma, RunStatus, WorkflowType } from 'generated/prisma';
import { CrawlRunQueryType } from './dto/crawl-run-query.schema';
import { PaginatedResult } from './interfaces/crawl-run.interface';

interface CrawlJobData {
  workflowRunId: string;
}

const STOPPABLE_JOB_STATUSES: JobStatus[] = [
  JobStatus.WAITING,
  JobStatus.ACTIVE,
  JobStatus.DELAYED,
  JobStatus.PAUSED,
];

const ACTIVE_RUN_STATUSES: RunStatus[] = [
  RunStatus.QUEUED,
  RunStatus.RUNNING,
];

@Injectable()
export class CrawlRunsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CRAWL_QUEUE) private readonly crawlQueue: Queue<CrawlJobData>,
  ) {}

  async enqueue(websiteTargetId: string, workflowConfigId?: string) {
    const websiteTarget = await this.prisma.websiteTarget.findUniqueOrThrow({
      where: { id: websiteTargetId },
      select: { user_id: true },
    });

    const run = await this.prisma.workflowRun.create({
      data: {
        user_id: websiteTarget.user_id,
        type: WorkflowType.SCRAPER,
        workflow_config_id: workflowConfigId!,
        website_target_id: websiteTargetId,
        status: RunStatus.QUEUED,
      },
    });

    await this.crawlQueue.add(
      'crawl',
      { workflowRunId: run.id },
      {
        attempts: DEFAULT_CRAWL_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: DEFAULT_CRAWL_JOB_BACKOFF_MS,
        },
      },
    );

    return run;
  }

  async findAll(
    authUser: AuthUser,
    query: CrawlRunQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.WorkflowRunWhereInput = {
      ...workflowRunUserWhere(authUser, query.user_id),
      type: query.type ?? WorkflowType.SCRAPER,
      ...(query.status && { status: query.status }),
      ...(query.website_target_id && { website_target_id: query.website_target_id }),
      ...(query.workflow_config_id && { workflow_config_id: query.workflow_config_id }),
      ...(query.date_from || query.date_to
        ? {
            created_at: {
              ...(query.date_from && { gte: query.date_from }),
              ...(query.date_to && { lte: query.date_to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        include: {
          website_target: { select: { name: true } },
          workflow_config: { select: { name: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next: query.page < Math.ceil(total / query.limit),
        has_prev: query.page > 1,
      },
    };
  }

  async findOne(authUser: AuthUser, id: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, ...workflowRunUserWhere(authUser) },
      include: {
        website_target: { select: { name: true } },
        workflow_config: { select: { name: true } },
        execution_traces: {
          orderBy: { created_at: 'asc' },
        },
        job_logs: {
          orderBy: { created_at: 'asc' },
        },
        diagnostics_package: {
          select: { id: true, mode: true },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    return run;
  }

  async rerun(authUser: AuthUser, id: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, ...workflowRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    return this.enqueue(run.website_target_id!, run.workflow_config_id);
  }

  async cancel(authUser: AuthUser, id: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, ...workflowRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    if (!ACTIVE_RUN_STATUSES.includes(run.status)) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING runs can be stopped',
      );
    }

    const jobLogs = await this.prisma.jobLog.findMany({
      where: {
        workflow_run_id: id,
        status: { in: STOPPABLE_JOB_STATUSES },
      },
    });

    for (const jobLog of jobLogs) {
      if (!jobLog.job_id) continue;
      try {
        await this.crawlQueue.remove(jobLog.job_id);
      } catch {}
    }

    const finishedAt = new Date();
    const durationMs = run.started_at
      ? finishedAt.getTime() - run.started_at.getTime()
      : null;

    const cancelled = await this.prisma.workflowRun.updateMany({
      where: {
        id,
        status: { in: ACTIVE_RUN_STATUSES },
      },
      data: {
        status: RunStatus.CANCELLED,
        finished_at: finishedAt,
        duration_ms: durationMs,
        error_message: 'Cancelled by admin',
      },
    });

    if (cancelled.count === 0) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING runs can be stopped',
      );
    }

    if (jobLogs.length > 0) {
      await this.prisma.jobLog.updateMany({
        where: { id: { in: jobLogs.map((jobLog) => jobLog.id) } },
        data: {
          status: JobStatus.FAILED,
          finished_at: finishedAt,
          error_message: 'Cancelled by admin',
        },
      });

      for (const jobLog of jobLogs) {
        if (!jobLog.started_at) continue;
        await this.prisma.jobLog.update({
          where: { id: jobLog.id },
          data: {
            duration_ms: finishedAt.getTime() - jobLog.started_at.getTime(),
          },
        });
      }
    }

    return this.findOne(authUser, id);
  }

  async remove(authUser: AuthUser, id: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, ...workflowRunUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    if (ACTIVE_RUN_STATUSES.includes(run.status)) {
      throw new BadRequestException('Cancel the run before deleting it');
    }

    await this.prisma.workflowRun.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, runIds: string[]) {
    const uniqueIds = [...new Set(runIds)];
    const runs = await this.prisma.workflowRun.findMany({
      where: { id: { in: uniqueIds }, ...workflowRunUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (runs.length !== uniqueIds.length) {
      throw new NotFoundException('One or more workflow runs not found');
    }

    if (runs.some((run) => ACTIVE_RUN_STATUSES.includes(run.status))) {
      throw new BadRequestException(
        'Cancel active runs before deleting them',
      );
    }

    await this.prisma.workflowRun.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  async hasActiveRunForWebsiteTarget(websiteTargetId: string): Promise<boolean> {
    const active = await this.prisma.workflowRun.findFirst({
      where: {
        website_target_id: websiteTargetId,
        status: { in: ACTIVE_RUN_STATUSES },
      },
      select: { id: true },
    });

    return active !== null;
  }
}
