import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  BROWSER_AGENT_QUEUE,
  CRAWL_QUEUE,
  GENERATION_QUEUE,
  PLAIN_SCRAPE_QUEUE,
} from '@/core/queues/queues.constants';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { jobLogUserWhere } from '@/shared/utils/user/user-scope.utils';
import {
  DEFAULT_CRAWL_JOB_ATTEMPTS,
  DEFAULT_CRAWL_JOB_BACKOFF_MS,
} from '@/integrations/crawler/constants/crawler.constants';
import { JobStatus, Prisma } from 'generated/prisma';
import { JobLogQueryType } from './dto/job-log-query.schema';
import { PaginatedResult } from './interfaces/job-log.interface';

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  JobStatus.WAITING,
  JobStatus.ACTIVE,
  JobStatus.DELAYED,
  JobStatus.PAUSED,
];

const WORKFLOW_QUEUES: ReadonlySet<string> = new Set([
  CRAWL_QUEUE,
  PLAIN_SCRAPE_QUEUE,
  BROWSER_AGENT_QUEUE,
]);

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(GENERATION_QUEUE)
    private readonly generationQueue: Queue,
    @InjectQueue(CRAWL_QUEUE) private readonly crawlQueue: Queue,
    @InjectQueue(PLAIN_SCRAPE_QUEUE)
    private readonly plainScrapeQueue: Queue,
    @InjectQueue(BROWSER_AGENT_QUEUE)
    private readonly browserAgentQueue: Queue,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: JobLogQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.JobLogWhereInput = {
      ...jobLogUserWhere(authUser),
      ...(query.status && { status: query.status }),
      ...(query.queue_name && { queue_name: query.queue_name }),
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
      this.prisma.jobLog.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.jobLog.count({ where }),
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
    const job = await this.prisma.jobLog.findFirst({
      where: { id, ...jobLogUserWhere(authUser) },
    });

    if (!job) {
      throw new NotFoundException('Job log not found');
    }

    return job;
  }

  async retry(authUser: AuthUser, id: string) {
    const jobLog = await this.prisma.jobLog.findFirst({
      where: { id, ...jobLogUserWhere(authUser) },
    });

    if (!jobLog) {
      throw new NotFoundException('Job log not found');
    }

    if (!jobLog.payload || typeof jobLog.payload !== 'object') {
      throw new BadRequestException('Job log has no payload to retry');
    }

    const queue = this.resolveQueue(jobLog.queue_name);
    const nextAttempt = jobLog.attempt + 1;
    const payload = jobLog.payload as Record<string, unknown>;

    await this.prisma.jobLog.update({
      where: { id },
      data: {
        status: JobStatus.WAITING,
        attempt: nextAttempt,
        started_at: null,
        finished_at: null,
        duration_ms: null,
        error_message: null,
        stack_trace: null,
        result: null,
      },
    });

    const enrichedPayload = WORKFLOW_QUEUES.has(jobLog.queue_name)
      ? { ...payload, jobLogId: jobLog.id }
      : payload;

    const jobOptions = WORKFLOW_QUEUES.has(jobLog.queue_name)
      ? {
          attempts: DEFAULT_CRAWL_JOB_ATTEMPTS,
          backoff: {
            type: 'exponential' as const,
            delay: DEFAULT_CRAWL_JOB_BACKOFF_MS,
          },
        }
      : undefined;

    await queue.add(jobLog.job_name ?? 'retry', enrichedPayload, jobOptions);

    return this.findOne(authUser, id);
  }

  async stop(authUser: AuthUser, id: string) {
    const jobLog = await this.prisma.jobLog.findFirst({
      where: { id, ...jobLogUserWhere(authUser) },
    });

    if (!jobLog) {
      throw new NotFoundException('Job log not found');
    }

    if (!ACTIVE_JOB_STATUSES.includes(jobLog.status)) {
      throw new BadRequestException(
        'Only queued or running jobs can be stopped',
      );
    }

    if (jobLog.job_id) {
      try {
        const queue = this.resolveQueue(jobLog.queue_name);
        await queue.remove(jobLog.job_id);
      } catch {}
    }

    const finishedAt = new Date();

    return this.prisma.jobLog.update({
      where: { id },
      data: {
        status: JobStatus.FAILED,
        finished_at: finishedAt,
        duration_ms: jobLog.started_at
          ? finishedAt.getTime() - jobLog.started_at.getTime()
          : null,
        error_message: 'Stopped by admin',
      },
    });
  }

  async remove(authUser: AuthUser, id: string) {
    const jobLog = await this.prisma.jobLog.findFirst({
      where: { id, ...jobLogUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (!jobLog) {
      throw new NotFoundException('Job log not found');
    }

    if (ACTIVE_JOB_STATUSES.includes(jobLog.status)) {
      throw new BadRequestException('Stop the job before deleting it');
    }

    await this.prisma.jobLog.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, jobIds: string[]) {
    const uniqueIds = [...new Set(jobIds)];
    const jobLogs = await this.prisma.jobLog.findMany({
      where: { id: { in: uniqueIds }, ...jobLogUserWhere(authUser) },
      select: { id: true, status: true },
    });

    if (jobLogs.length !== uniqueIds.length) {
      throw new NotFoundException('One or more job logs not found');
    }

    if (jobLogs.some((jobLog) => ACTIVE_JOB_STATUSES.includes(jobLog.status))) {
      throw new BadRequestException('Stop active jobs before deleting them');
    }

    await this.prisma.jobLog.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  private resolveQueue(queueName: string): Queue {
    if (queueName === GENERATION_QUEUE) {
      return this.generationQueue;
    }
    if (queueName === CRAWL_QUEUE) {
      return this.crawlQueue;
    }
    if (queueName === PLAIN_SCRAPE_QUEUE) {
      return this.plainScrapeQueue;
    }
    if (queueName === BROWSER_AGENT_QUEUE) {
      return this.browserAgentQueue;
    }
    throw new BadRequestException(`Unsupported queue: ${queueName}`);
  }
}
