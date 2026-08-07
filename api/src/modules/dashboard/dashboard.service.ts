import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import {
  generationRunUserWhere,
  jobLogUserWhere,
  resolveScopeUserId,
  websiteTargetUserWhere,
  workflowConfigUserWhere,
  workflowRunUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  GenerationRunStatus,
  JobStatus,
  Prisma,
  RunStatus,
  ScraperStatus,
  WorkflowType,
} from 'generated/prisma';
import { DashboardQueryType } from './dto/dashboard-query.schema';
import { DashboardActivityItem } from './entities/dashboard.entity';

const RUNNING_STATUSES: RunStatus[] = [RunStatus.QUEUED, RunStatus.RUNNING];
const SUCCESS_STATUSES: RunStatus[] = [RunStatus.SUCCESS, RunStatus.PARTIAL_SUCCESS];

const ACTIVE_GENERATION_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatus.QUEUED,
  GenerationRunStatus.RUNNING,
  GenerationRunStatus.AWAITING_REVIEW,
];

const ACTIVITY_LIMIT = 20;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(authUser: AuthUser, query: DashboardQueryType) {
    const queryUserId = query.user_id;
    const configWhere = workflowConfigUserWhere(authUser, queryUserId);
    const scraperConfigWhere: Prisma.WorkflowConfigWhereInput = {
      ...configWhere,
      type: WorkflowType.SCRAPER,
    };
    const targetWhere = websiteTargetUserWhere(authUser, queryUserId);
    const runWhere = workflowRunUserWhere(authUser, queryUserId);
    const generationWhere = generationRunUserWhere(authUser, queryUserId);
    const jobWhere = jobLogUserWhere(authUser, queryUserId);
    const extractedWhere = this.extractedItemUserWhere(authUser, queryUserId);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      scrapersTotal,
      scrapersActive,
      scrapersBroken,
      targetsTotal,
      runningRuns,
      failedRuns24h,
      lastRun,
      queueWaiting,
      queueActive,
      queueFailed,
      activeGenerationRuns,
      extractedItemsTotal,
      recentSuccessfulRuns,
      recentFailedRuns,
      recentBrokenScrapers,
      recentGenerationRuns,
    ] = await Promise.all([
      this.prisma.workflowConfig.count({ where: scraperConfigWhere }),
      this.prisma.workflowConfig.count({
        where: { ...scraperConfigWhere, status: ScraperStatus.ACTIVE },
      }),
      this.prisma.workflowConfig.count({
        where: { ...scraperConfigWhere, status: ScraperStatus.BROKEN },
      }),
      this.prisma.websiteTarget.count({ where: targetWhere }),
      this.prisma.workflowRun.count({
        where: { ...runWhere, status: { in: RUNNING_STATUSES } },
      }),
      this.prisma.workflowRun.count({
        where: {
          ...runWhere,
          status: RunStatus.FAILED,
          created_at: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.workflowRun.findFirst({
        where: { ...runWhere, finished_at: { not: null } },
        orderBy: { finished_at: 'desc' },
        select: { finished_at: true },
      }),
      this.prisma.jobLog.count({
        where: { ...jobWhere, status: JobStatus.WAITING },
      }),
      this.prisma.jobLog.count({
        where: { ...jobWhere, status: JobStatus.ACTIVE },
      }),
      this.prisma.jobLog.count({
        where: { ...jobWhere, status: JobStatus.FAILED },
      }),
      this.prisma.scraperGenerationRun.count({
        where: { ...generationWhere, status: { in: ACTIVE_GENERATION_STATUSES } },
      }),
      this.prisma.extractedItem.count({ where: extractedWhere }),
      this.prisma.workflowRun.findMany({
        where: { ...runWhere, status: { in: SUCCESS_STATUSES } },
        orderBy: { finished_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          workflow_config_id: true,
          finished_at: true,
          created_at: true,
          website_target: { select: { name: true } },
        },
      }),
      this.prisma.workflowRun.findMany({
        where: { ...runWhere, status: RunStatus.FAILED },
        orderBy: { finished_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          workflow_config_id: true,
          finished_at: true,
          created_at: true,
          error_message: true,
          website_target: { select: { name: true } },
        },
      }),
      this.prisma.workflowConfig.findMany({
        where: { ...scraperConfigWhere, status: ScraperStatus.BROKEN },
        orderBy: { last_failure_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          name: true,
          last_failure_at: true,
          updated_at: true,
          website_target: { select: { name: true } },
        },
      }),
      this.prisma.scraperGenerationRun.findMany({
        where: generationWhere,
        orderBy: { created_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          workflow_config_id: true,
          status: true,
          trigger: true,
          created_at: true,
          finished_at: true,
          error_message: true,
          website_target: { select: { name: true } },
        },
      }),
    ]);

    const activityFeed = this.buildActivityFeed(
      recentSuccessfulRuns,
      recentFailedRuns,
      recentBrokenScrapers,
      recentGenerationRuns,
    );

    return {
      scrapers_total: scrapersTotal,
      scrapers_active: scrapersActive,
      scrapers_broken: scrapersBroken,
      targets_total: targetsTotal,
      running_crawls: runningRuns,
      failed_crawls_24h: failedRuns24h,
      last_crawl_at: lastRun?.finished_at ?? null,
      queue_waiting: queueWaiting,
      queue_active: queueActive,
      queue_failed: queueFailed,
      active_generation_runs: activeGenerationRuns,
      extracted_items_total: extractedItemsTotal,
      activity_feed: activityFeed,
    };
  }

  private extractedItemUserWhere(
    authUser: AuthUser,
    queryUserId?: string,
  ): Prisma.ExtractedItemWhereInput {
    const scopeId = resolveScopeUserId(authUser, queryUserId);
    return scopeId ? { website_target: { user_id: scopeId } } : {};
  }

  private buildActivityFeed(
    successfulRuns: {
      id: string;
      website_target_id: string | null;
      workflow_config_id: string;
      finished_at: Date | null;
      created_at: Date;
      website_target: { name: string } | null;
    }[],
    failedRuns: {
      id: string;
      website_target_id: string | null;
      workflow_config_id: string;
      finished_at: Date | null;
      created_at: Date;
      error_message: string | null;
      website_target: { name: string } | null;
    }[],
    brokenConfigs: {
      id: string;
      website_target_id: string | null;
      name: string;
      last_failure_at: Date | null;
      updated_at: Date;
      website_target: { name: string } | null;
    }[],
    generationRuns: {
      id: string;
      website_target_id: string;
      workflow_config_id: string | null;
      status: GenerationRunStatus;
      trigger: string;
      created_at: Date;
      finished_at: Date | null;
      error_message: string | null;
      website_target: { name: string };
    }[],
  ): DashboardActivityItem[] {
    const items: DashboardActivityItem[] = [
      ...successfulRuns.map((run) => ({
        type: 'crawl' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target?.name ?? '',
        workflow_config_id: run.workflow_config_id,
        workflow_run_id: run.id,
        message: 'Run completed',
        occurred_at: run.finished_at ?? run.created_at,
      })),
      ...failedRuns.map((run) => ({
        type: 'crawl_failed' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target?.name ?? '',
        workflow_config_id: run.workflow_config_id,
        workflow_run_id: run.id,
        message: run.error_message,
        occurred_at: run.finished_at ?? run.created_at,
      })),
      ...brokenConfigs.map((config) => ({
        type: 'scraper_broken' as const,
        id: config.id,
        website_target_id: config.website_target_id,
        website_target_name: config.website_target?.name ?? '',
        workflow_config_id: config.id,
        message: `Scraper "${config.name}" is broken`,
        occurred_at: config.last_failure_at ?? config.updated_at,
      })),
      ...generationRuns.map((run) => ({
        type: 'generation' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target.name,
        workflow_config_id: run.workflow_config_id,
        generation_run_id: run.id,
        message:
          run.error_message ??
          `${run.trigger} generation run ${run.status.toLowerCase()}`,
        occurred_at: run.finished_at ?? run.created_at,
      })),
    ];

    return items
      .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime())
      .slice(0, ACTIVITY_LIMIT);
  }
}
