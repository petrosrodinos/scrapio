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
import { crawlRunUserWhere } from '@/shared/utils/user/user-scope.utils';
import {
  DEFAULT_CRAWL_JOB_ATTEMPTS,
  DEFAULT_CRAWL_JOB_BACKOFF_MS,
} from '@/integrations/crawler/constants/crawler.constants';
import { CrawlRunStatus, JobStatus, Prisma } from 'generated/prisma';
import { CrawlRunQueryType } from './dto/crawl-run-query.schema';
import { PaginatedResult } from './interfaces/crawl-run.interface';

interface CrawlJobData {
  crawlRunId: string;
}

const STOPPABLE_JOB_STATUSES: JobStatus[] = [
  JobStatus.WAITING,
  JobStatus.ACTIVE,
  JobStatus.DELAYED,
  JobStatus.PAUSED,
];

const ACTIVE_CRAWL_RUN_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatus.QUEUED,
  CrawlRunStatus.RUNNING,
];

@Injectable()
export class CrawlRunsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CRAWL_QUEUE) private readonly crawlQueue: Queue<CrawlJobData>,
  ) {}

  async enqueue(websiteTargetId: string, scraperId?: string) {
    const websiteTarget = await this.prisma.websiteTarget.findUniqueOrThrow({
      where: { id: websiteTargetId },
      select: { user_id: true },
    });

    const run = await this.prisma.crawlRun.create({
      data: {
        user_id: websiteTarget.user_id,
        website_target_id: websiteTargetId,
        scraper_id: scraperId ?? null,
        status: CrawlRunStatus.QUEUED,
      },
    });

    await this.crawlQueue.add(
      'crawl',
      { crawlRunId: run.id },
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
    const where: Prisma.CrawlRunWhereInput = {
      ...crawlRunUserWhere(authUser, query.user_id),
      ...(query.status && { status: query.status }),
      ...(query.website_target_id && { website_target_id: query.website_target_id }),
      ...(query.scraper_id && { scraper_id: query.scraper_id }),
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
      this.prisma.crawlRun.findMany({
        where,
        include: {
          website_target: { select: { name: true } },
          scraper: { select: { name: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.crawlRun.count({ where }),
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
    const run = await this.prisma.crawlRun.findFirst({
      where: { id, ...crawlRunUserWhere(authUser) },
      include: {
        website_target: { select: { name: true } },
        scraper: { select: { name: true } },
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
      throw new NotFoundException('Crawl run not found');
    }

    return run;
  }

  async rerun(authUser: AuthUser, id: string) {
    const run = await this.prisma.crawlRun.findFirst({
      where: { id, ...crawlRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Crawl run not found');
    }

    return this.enqueue(run.website_target_id, run.scraper_id ?? undefined);
  }

  async cancel(authUser: AuthUser, id: string) {
    const run = await this.prisma.crawlRun.findFirst({
      where: { id, ...crawlRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Crawl run not found');
    }

    if (!ACTIVE_CRAWL_RUN_STATUSES.includes(run.status)) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING crawl runs can be stopped',
      );
    }

    const jobLogs = await this.prisma.jobLog.findMany({
      where: {
        crawl_run_id: id,
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

    const cancelled = await this.prisma.crawlRun.updateMany({
      where: {
        id,
        status: { in: ACTIVE_CRAWL_RUN_STATUSES },
      },
      data: {
        status: CrawlRunStatus.CANCELLED,
        finished_at: finishedAt,
        duration_ms: durationMs,
        error_message: 'Cancelled by admin',
      },
    });

    if (cancelled.count === 0) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING crawl runs can be stopped',
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
    const run = await this.prisma.crawlRun.findFirst({
      where: { id, ...crawlRunUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (!run) {
      throw new NotFoundException('Crawl run not found');
    }

    if (ACTIVE_CRAWL_RUN_STATUSES.includes(run.status)) {
      throw new BadRequestException('Cancel the crawl run before deleting it');
    }

    await this.prisma.crawlRun.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, crawlRunIds: string[]) {
    const uniqueIds = [...new Set(crawlRunIds)];
    const runs = await this.prisma.crawlRun.findMany({
      where: { id: { in: uniqueIds }, ...crawlRunUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (runs.length !== uniqueIds.length) {
      throw new NotFoundException('One or more crawl runs not found');
    }

    if (runs.some((run) => ACTIVE_CRAWL_RUN_STATUSES.includes(run.status))) {
      throw new BadRequestException(
        'Cancel active crawl runs before deleting them',
      );
    }

    await this.prisma.crawlRun.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  async hasActiveRunForWebsiteTarget(websiteTargetId: string): Promise<boolean> {
    const active = await this.prisma.crawlRun.findFirst({
      where: {
        website_target_id: websiteTargetId,
        status: { in: ACTIVE_CRAWL_RUN_STATUSES },
      },
      select: { id: true },
    });

    return active !== null;
  }
}
