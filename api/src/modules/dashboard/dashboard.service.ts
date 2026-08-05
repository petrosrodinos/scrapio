import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import {
  crawlRunUserWhere,
  generationRunUserWhere,
  jobLogUserWhere,
  resolveScopeUserId,
  scraperUserWhere,
  websiteTargetUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  CrawlRunStatus,
  GenerationRunStatus,
  JobStatus,
  Prisma,
  ScraperStatus,
} from 'generated/prisma';
import { DashboardQueryType } from './dto/dashboard-query.schema';
import { DashboardActivityItem } from './entities/dashboard.entity';

const RUNNING_CRAWL_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatus.QUEUED,
  CrawlRunStatus.RUNNING,
];

const SUCCESS_CRAWL_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatus.SUCCESS,
  CrawlRunStatus.PARTIAL_SUCCESS,
];

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
    const scraperWhere = scraperUserWhere(authUser, queryUserId);
    const targetWhere = websiteTargetUserWhere(authUser, queryUserId);
    const crawlWhere = crawlRunUserWhere(authUser, queryUserId);
    const generationWhere = generationRunUserWhere(authUser, queryUserId);
    const jobWhere = jobLogUserWhere(authUser, queryUserId);
    const extractedWhere = this.extractedItemUserWhere(authUser, queryUserId);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      scrapersTotal,
      scrapersActive,
      scrapersBroken,
      targetsTotal,
      runningCrawls,
      failedCrawls24h,
      lastCrawl,
      queueWaiting,
      queueActive,
      queueFailed,
      activeGenerationRuns,
      extractedItemsTotal,
      recentSuccessfulCrawls,
      recentFailedCrawls,
      recentBrokenScrapers,
      recentGenerationRuns,
    ] = await Promise.all([
      this.prisma.scraper.count({ where: scraperWhere }),
      this.prisma.scraper.count({
        where: { ...scraperWhere, status: ScraperStatus.ACTIVE },
      }),
      this.prisma.scraper.count({
        where: { ...scraperWhere, status: ScraperStatus.BROKEN },
      }),
      this.prisma.websiteTarget.count({ where: targetWhere }),
      this.prisma.crawlRun.count({
        where: {
          ...crawlWhere,
          status: { in: RUNNING_CRAWL_STATUSES },
        },
      }),
      this.prisma.crawlRun.count({
        where: {
          ...crawlWhere,
          status: CrawlRunStatus.FAILED,
          created_at: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.crawlRun.findFirst({
        where: {
          ...crawlWhere,
          finished_at: { not: null },
        },
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
        where: {
          ...generationWhere,
          status: { in: ACTIVE_GENERATION_STATUSES },
        },
      }),
      this.prisma.extractedItem.count({ where: extractedWhere }),
      this.prisma.crawlRun.findMany({
        where: {
          ...crawlWhere,
          status: { in: SUCCESS_CRAWL_STATUSES },
        },
        orderBy: { finished_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          scraper_id: true,
          finished_at: true,
          created_at: true,
          total_found: true,
          website_target: { select: { name: true } },
        },
      }),
      this.prisma.crawlRun.findMany({
        where: {
          ...crawlWhere,
          status: CrawlRunStatus.FAILED,
        },
        orderBy: { finished_at: 'desc' },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          website_target_id: true,
          scraper_id: true,
          finished_at: true,
          created_at: true,
          error_message: true,
          website_target: { select: { name: true } },
        },
      }),
      this.prisma.scraper.findMany({
        where: { ...scraperWhere, status: ScraperStatus.BROKEN },
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
          scraper_id: true,
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
      recentSuccessfulCrawls,
      recentFailedCrawls,
      recentBrokenScrapers,
      recentGenerationRuns,
    );

    return {
      scrapers_total: scrapersTotal,
      scrapers_active: scrapersActive,
      scrapers_broken: scrapersBroken,
      targets_total: targetsTotal,
      running_crawls: runningCrawls,
      failed_crawls_24h: failedCrawls24h,
      last_crawl_at: lastCrawl?.finished_at ?? null,
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
    successfulCrawls: {
      id: string;
      website_target_id: string;
      scraper_id: string | null;
      finished_at: Date | null;
      created_at: Date;
      total_found: number;
      website_target: { name: string };
    }[],
    failedCrawls: {
      id: string;
      website_target_id: string;
      scraper_id: string | null;
      finished_at: Date | null;
      created_at: Date;
      error_message: string | null;
      website_target: { name: string };
    }[],
    brokenScrapers: {
      id: string;
      website_target_id: string;
      name: string;
      last_failure_at: Date | null;
      updated_at: Date;
      website_target: { name: string };
    }[],
    generationRuns: {
      id: string;
      website_target_id: string;
      scraper_id: string | null;
      status: GenerationRunStatus;
      trigger: string;
      created_at: Date;
      finished_at: Date | null;
      error_message: string | null;
      website_target: { name: string };
    }[],
  ): DashboardActivityItem[] {
    const items: DashboardActivityItem[] = [
      ...successfulCrawls.map((run) => ({
        type: 'crawl' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target.name,
        scraper_id: run.scraper_id,
        crawl_run_id: run.id,
        message: `Crawl completed with ${run.total_found} items found`,
        occurred_at: run.finished_at ?? run.created_at,
      })),
      ...failedCrawls.map((run) => ({
        type: 'crawl_failed' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target.name,
        scraper_id: run.scraper_id,
        crawl_run_id: run.id,
        message: run.error_message,
        occurred_at: run.finished_at ?? run.created_at,
      })),
      ...brokenScrapers.map((scraper) => ({
        type: 'scraper_broken' as const,
        id: scraper.id,
        website_target_id: scraper.website_target_id,
        website_target_name: scraper.website_target.name,
        scraper_id: scraper.id,
        message: `Scraper "${scraper.name}" is broken`,
        occurred_at: scraper.last_failure_at ?? scraper.updated_at,
      })),
      ...generationRuns.map((run) => ({
        type: 'generation' as const,
        id: run.id,
        website_target_id: run.website_target_id,
        website_target_name: run.website_target.name,
        scraper_id: run.scraper_id,
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
