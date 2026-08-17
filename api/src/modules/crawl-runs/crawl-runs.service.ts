import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { WORKFLOW_RUN_STATUS_CHANGED_EVENT } from '@/shared/interfaces/workflow-run-status-changed.event';
import {
  BROWSER_AGENT_QUEUE,
  CRAWL_QUEUE,
  PLAIN_SCRAPE_QUEUE,
} from '@/core/queues/queues.constants';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { workflowRunUserWhere } from '@/shared/utils/user/user-scope.utils';
import {
  DEFAULT_CRAWL_JOB_ATTEMPTS,
  DEFAULT_CRAWL_JOB_BACKOFF_MS,
} from '@/integrations/crawler/constants/crawler.constants';
import { ScreenshotStorageService } from '@/integrations/computer-use/services/screenshot-storage.service';
import { NetworkCaptureStorageService } from '@/integrations/api-capture/services/network-capture-storage.service';
import { JobStatus, Prisma, RunStatus, WorkflowType } from 'generated/prisma';
import { CrawlRunQueryType } from './dto/crawl-run-query.schema';
import { PaginatedResult } from '@/shared/interfaces/paginated-result.interface';

interface WorkflowJobData {
  workflowRunId: string;
}

const STOPPABLE_JOB_STATUSES: JobStatus[] = [
  JobStatus.WAITING,
  JobStatus.ACTIVE,
  JobStatus.DELAYED,
  JobStatus.PAUSED,
];

const ACTIVE_RUN_STATUSES: RunStatus[] = [RunStatus.QUEUED, RunStatus.RUNNING];

@Injectable()
export class CrawlRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screenshotStorage: ScreenshotStorageService,
    private readonly networkCaptureStorage: NetworkCaptureStorageService,
    @InjectQueue(CRAWL_QUEUE)
    private readonly crawlQueue: Queue<WorkflowJobData>,
    @InjectQueue(PLAIN_SCRAPE_QUEUE)
    private readonly plainScrapeQueue: Queue<WorkflowJobData>,
    @InjectQueue(BROWSER_AGENT_QUEUE)
    private readonly browserAgentQueue: Queue<WorkflowJobData>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getQueueForType(type: WorkflowType): Queue<WorkflowJobData> {
    switch (type) {
      case WorkflowType.SCRAPER:
        return this.crawlQueue;
      case WorkflowType.PLAIN_SCRAPE:
        return this.plainScrapeQueue;
      case WorkflowType.BROWSER_AGENT:
        return this.browserAgentQueue;
    }
  }

  private getJobNameForType(type: WorkflowType): string {
    switch (type) {
      case WorkflowType.SCRAPER:
        return 'crawl';
      case WorkflowType.PLAIN_SCRAPE:
        return 'plain-scrape';
      case WorkflowType.BROWSER_AGENT:
        return 'browser-agent';
    }
  }

  async enqueue(websiteTargetId: string, workflowConfigId?: string) {
    const websiteTarget = await this.prisma.websiteTarget.findUniqueOrThrow({
      where: { id: websiteTargetId },
      select: { user_id: true },
    });

    const config = workflowConfigId
      ? await this.prisma.workflowConfig.findUnique({
          where: { id: workflowConfigId },
          select: {
            active_version: true,
            persist_results: true,
            ai_batch_mode: true,
          },
        })
      : null;
    const activeVersion = config?.active_version ?? null;

    const run = await this.prisma.workflowRun.create({
      data: {
        user_id: websiteTarget.user_id,
        type: WorkflowType.SCRAPER,
        workflow_config_id: workflowConfigId!,
        website_target_id: websiteTargetId,
        scraper_version_id: activeVersion?.id ?? null,
        urls: [],
        output_formats: activeVersion?.output_formats ?? [],
        extraction_schema_version_id:
          activeVersion?.extraction_schema_version_id ?? null,
        persist_results: config?.persist_results ?? true,
        ai_batch_mode: config?.ai_batch_mode ?? false,
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

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId: run.id,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status: RunStatus.QUEUED,
      persistResults: run.persist_results,
    });

    return run;
  }

  async enqueuePlainScrape(workflowConfigId: string) {
    const config = await this.prisma.workflowConfig.findUniqueOrThrow({
      where: { id: workflowConfigId },
      select: {
        user_id: true,
        type: true,
        urls: true,
        extraction_scope: true,
        output_formats: true,
        extraction_schema_version_id: true,
        persist_results: true,
        ai_batch_mode: true,
      },
    });

    if (config.type !== WorkflowType.PLAIN_SCRAPE) {
      throw new BadRequestException(
        'Workflow config is not a plain scrape config',
      );
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        user_id: config.user_id,
        type: WorkflowType.PLAIN_SCRAPE,
        workflow_config_id: workflowConfigId,
        urls: config.urls,
        extraction_scope: config.extraction_scope,
        output_formats: config.output_formats,
        extraction_schema_version_id: config.extraction_schema_version_id,
        persist_results: config.persist_results,
        ai_batch_mode: config.ai_batch_mode,
        status: RunStatus.QUEUED,
      },
    });

    await this.plainScrapeQueue.add(
      'plain-scrape',
      { workflowRunId: run.id },
      {
        attempts: DEFAULT_CRAWL_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: DEFAULT_CRAWL_JOB_BACKOFF_MS,
        },
      },
    );

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId: run.id,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status: RunStatus.QUEUED,
      persistResults: run.persist_results,
    });

    return run;
  }

  async enqueueBrowserAgent(workflowConfigId: string) {
    const config = await this.prisma.workflowConfig.findUniqueOrThrow({
      where: { id: workflowConfigId },
      select: {
        user_id: true,
        type: true,
        url: true,
        max_steps: true,
        capture_api: true,
        output_formats: true,
        extraction_schema_version_id: true,
        persist_results: true,
        ai_batch_mode: true,
      },
    });

    if (config.type !== WorkflowType.BROWSER_AGENT) {
      throw new BadRequestException(
        'Workflow config is not a browser agent config',
      );
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        user_id: config.user_id,
        type: WorkflowType.BROWSER_AGENT,
        workflow_config_id: workflowConfigId,
        url: config.url,
        max_steps: config.max_steps,
        capture_api: config.capture_api,
        urls: [],
        output_formats: config.output_formats,
        extraction_schema_version_id: config.extraction_schema_version_id,
        persist_results: config.persist_results,
        ai_batch_mode: config.ai_batch_mode,
        status: RunStatus.QUEUED,
      },
    });

    await this.browserAgentQueue.add(
      'browser-agent',
      { workflowRunId: run.id },
      {
        attempts: DEFAULT_CRAWL_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: DEFAULT_CRAWL_JOB_BACKOFF_MS,
        },
      },
    );

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId: run.id,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status: RunStatus.QUEUED,
      persistResults: run.persist_results,
    });

    return run;
  }

  async findAll(
    authUser: AuthUser,
    query: CrawlRunQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.WorkflowRunWhereInput = {
      ...workflowRunUserWhere(authUser, query.user_id),
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
      ...(query.website_target_id && {
        website_target_id: query.website_target_id,
      }),
      ...(query.workflow_config_id && {
        workflow_config_id: query.workflow_config_id,
      }),
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
        pages: {
          orderBy: { created_at: 'asc' },
          include: { extraction_result: true },
        },
        extraction_result: true,
        steps: {
          orderBy: { step_index: 'asc' },
          include: {
            screenshot_before: { select: { path: true } },
            screenshot_after: { select: { path: true } },
          },
        },
        openapi_spec_document: { select: { path: true } },
      },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    const [steps, openapi_spec_url] = await Promise.all([
      this.screenshotStorage.attachSignedUrls(run.steps),
      run.openapi_spec_document?.path
        ? this.networkCaptureStorage.getSignedUrl(
            run.openapi_spec_document.path,
          )
        : Promise.resolve(null),
    ]);

    const result: Record<string, unknown> = {
      ...run,
      steps,
      openapi_spec_url,
    };
    delete result.openapi_spec_document;

    return result;
  }

  async rerun(authUser: AuthUser, id: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id, ...workflowRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Workflow run not found');
    }

    switch (run.type) {
      case WorkflowType.SCRAPER:
        return this.enqueue(run.website_target_id!, run.workflow_config_id);
      case WorkflowType.PLAIN_SCRAPE:
        return this.enqueuePlainScrape(run.workflow_config_id);
      case WorkflowType.BROWSER_AGENT:
        return this.enqueueBrowserAgent(run.workflow_config_id);
    }
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

    const queue = this.getQueueForType(run.type);

    for (const jobLog of jobLogs) {
      if (!jobLog.job_id) continue;
      try {
        await queue.remove(jobLog.job_id);
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

    this.eventEmitter.emit(WORKFLOW_RUN_STATUS_CHANGED_EVENT, {
      workflowRunId: id,
      userId: run.user_id,
      workflowConfigId: run.workflow_config_id,
      type: run.type,
      status: RunStatus.CANCELLED,
      persistResults: run.persist_results,
      errorMessage: 'Cancelled by admin',
      startedAt: run.started_at,
      finishedAt,
      durationMs,
    });

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
      throw new BadRequestException('Cancel active runs before deleting them');
    }

    await this.prisma.workflowRun.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  async hasActiveRunForWebsiteTarget(
    websiteTargetId: string,
  ): Promise<boolean> {
    const active = await this.prisma.workflowRun.findFirst({
      where: {
        website_target_id: websiteTargetId,
        status: { in: ACTIVE_RUN_STATUSES },
      },
      select: { id: true },
    });

    return active !== null;
  }

  async hasActiveRunForWorkflowConfig(
    workflowConfigId: string,
  ): Promise<boolean> {
    const active = await this.prisma.workflowRun.findFirst({
      where: {
        workflow_config_id: workflowConfigId,
        status: { in: ACTIVE_RUN_STATUSES },
      },
      select: { id: true },
    });

    return active !== null;
  }
}
