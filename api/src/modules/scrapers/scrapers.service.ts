import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import { TERMINAL_WEBHOOK_EVENT_TYPES } from '@/modules/webhooks/constants/webhook-event-catalog.constant';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import {
  workflowConfigUserWhere,
  websiteTargetUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  OutputFormat,
  Prisma,
  RunStatus,
  ScraperStatus,
  ScraperVersionCreatedBy,
  WorkflowType,
} from 'generated/prisma';
import { CreateScraperDto } from './dto/create-scraper.dto';
import { CreateScraperVersionDto } from './dto/create-scraper-version.dto';
import { UpdateScraperDto } from './dto/update-scraper.dto';
import { ScraperQueryType } from './dto/scraper-query.schema';
import { PaginatedResult } from './interfaces/scraper.interface';

const ACTIVE_RUN_STATUSES: RunStatus[] = [RunStatus.QUEUED, RunStatus.RUNNING];

@Injectable()
export class ScrapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlRunsService: CrawlRunsService,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: ScraperQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.WorkflowConfigWhereInput = {
      ...workflowConfigUserWhere(authUser, query.user_id),
      type: WorkflowType.SCRAPER,
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' as const },
      }),
      ...(query.status && { status: query.status }),
      ...(query.health && { health: query.health }),
      ...(query.website_target_id && {
        website_target_id: query.website_target_id,
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.workflowConfig.findMany({
        where,
        include: { website_target: { select: { name: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.workflowConfig.count({ where }),
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
    const scraper = await this.prisma.workflowConfig.findFirst({
      where: { id, ...workflowConfigUserWhere(authUser), type: WorkflowType.SCRAPER },
      include: {
        website_target: { select: { name: true } },
        active_version: true,
      },
    });

    if (!scraper) {
      throw new NotFoundException('Scraper not found');
    }

    return scraper;
  }

  async create(authUser: AuthUser, dto: CreateScraperDto) {
    await this.ensureWebsiteTargetBelongsToUser(
      authUser,
      dto.website_target_id,
    );

    if (dto.persist_results === false) {
      await this.ensureForgetModeHasSubscriber(authUser.id);
    }

    if (dto.ai_batch_mode === true) {
      // A new scraper has no version yet, so output_formats/extraction_schema_version_id (set
      // via the scraper-generation flow, not this endpoint) can never satisfy the requirement.
      throw new BadRequestException(
        'AI batch mode requires an active version with a STRUCTURED_JSON output schema; enable it via update once one exists',
      );
    }

    const schedule = this.toScheduleData(dto.schedule_cron);
    const persistResults = dto.persist_results ?? true;

    if (dto.config === undefined) {
      return this.prisma.workflowConfig.create({
        data: {
          user_id: authUser.id,
          type: WorkflowType.SCRAPER,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
          urls: [],
          output_formats: [],
          persist_results: persistResults,
          ...schedule,
        },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const scraper = await tx.workflowConfig.create({
        data: {
          user_id: authUser.id,
          type: WorkflowType.SCRAPER,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
          urls: [],
          output_formats: [],
          persist_results: persistResults,
          ...schedule,
        },
      });

      const version = await tx.scraperVersion.create({
        data: {
          workflow_config_id: scraper.id,
          user_id: authUser.id,
          version: 1,
          config: dto.config as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.USER,
        },
      });

      return tx.workflowConfig.update({
        where: { id: scraper.id },
        data: { active_version_id: version.id, version_count: 1 },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    });
  }

  async listVersions(authUser: AuthUser, scraperId: string) {
    await this.ensureExists(authUser, scraperId);

    return this.prisma.scraperVersion.findMany({
      where: { workflow_config_id: scraperId },
      orderBy: { version: 'desc' },
    });
  }

  async createVersion(
    authUser: AuthUser,
    scraperId: string,
    dto: CreateScraperVersionDto,
  ) {
    await this.ensureExists(authUser, scraperId);

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.scraperVersion.findFirst({
        where: { workflow_config_id: scraperId },
        orderBy: { version: 'desc' },
      });

      const version = await tx.scraperVersion.create({
        data: {
          workflow_config_id: scraperId,
          user_id: authUser.id,
          version: (latest?.version ?? 0) + 1,
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          notes: dto.notes,
          created_by: ScraperVersionCreatedBy.USER,
        },
      });

      await tx.workflowConfig.update({
        where: { id: scraperId },
        data: { version_count: { increment: 1 } },
      });

      return version;
    });
  }

  async activateVersion(
    authUser: AuthUser,
    scraperId: string,
    versionId: string,
  ) {
    const scraper = await this.ensureExists(authUser, scraperId);

    const version = await this.prisma.scraperVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.workflow_config_id !== scraperId) {
      throw new NotFoundException('Version not found for this scraper');
    }

    return this.prisma.workflowConfig.update({
      where: { id: scraperId },
      data: {
        active_version_id: versionId,
        ...(scraper.status === ScraperStatus.BROKEN && {
          status: ScraperStatus.ACTIVE,
        }),
      },
      include: {
        active_version: true,
        website_target: { select: { name: true } },
      },
    });
  }

  async update(authUser: AuthUser, id: string, dto: UpdateScraperDto) {
    const scraper = await this.ensureExists(authUser, id);

    if (dto.persist_results === false) {
      await this.ensureForgetModeHasSubscriber(authUser.id);
    }

    if (dto.ai_batch_mode === true) {
      await this.ensureAiBatchModeSupported(scraper.active_version_id);
    }

    const schedule =
      dto.schedule_cron !== undefined
        ? this.toScheduleData(dto.schedule_cron)
        : undefined;

    if (dto.validation_rules === undefined) {
      return this.prisma.workflowConfig.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.self_healing_enabled !== undefined && {
            self_healing_enabled: dto.self_healing_enabled,
          }),
          ...(dto.diagnostics_mode !== undefined && {
            diagnostics_mode: dto.diagnostics_mode,
          }),
          ...(dto.persist_results !== undefined && {
            persist_results: dto.persist_results,
          }),
          ...(dto.ai_batch_mode !== undefined && {
            ai_batch_mode: dto.ai_batch_mode,
          }),
          ...schedule,
        },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const activeVersion = scraper.active_version_id
        ? await tx.scraperVersion.findUnique({
            where: { id: scraper.active_version_id },
          })
        : null;

      const latest = await tx.scraperVersion.findFirst({
        where: { workflow_config_id: id },
        orderBy: { version: 'desc' },
      });

      const newVersion = await tx.scraperVersion.create({
        data: {
          workflow_config_id: id,
          user_id: authUser.id,
          version: (latest?.version ?? 0) + 1,
          config: {
            ...((activeVersion?.config as Record<string, unknown>) ?? {}),
            validation_rules: dto.validation_rules,
          } as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.USER,
          notes: 'Updated validation_rules',
        },
      });

      return tx.workflowConfig.update({
        where: { id },
        data: {
          active_version_id: newVersion.id,
          version_count: { increment: 1 },
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.self_healing_enabled !== undefined && {
            self_healing_enabled: dto.self_healing_enabled,
          }),
          ...(dto.diagnostics_mode !== undefined && {
            diagnostics_mode: dto.diagnostics_mode,
          }),
          ...(dto.persist_results !== undefined && {
            persist_results: dto.persist_results,
          }),
          ...(dto.ai_batch_mode !== undefined && {
            ai_batch_mode: dto.ai_batch_mode,
          }),
          ...schedule,
        },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    });
  }

  async runNow(authUser: AuthUser, id: string) {
    const scraper = await this.ensureExists(authUser, id);

    return this.crawlRunsService.enqueue(
      scraper.website_target_id!,
      scraper.id,
    );
  }

  async remove(authUser: AuthUser, id: string) {
    await this.ensureExists(authUser, id);
    await this.ensureNoActiveRuns([id]);

    await this.prisma.workflowConfig.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, scraperIds: string[]) {
    const uniqueIds = [...new Set(scraperIds)];
    const count = await this.prisma.workflowConfig.count({
      where: {
        id: { in: uniqueIds },
        ...workflowConfigUserWhere(authUser),
        type: WorkflowType.SCRAPER,
      },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more scrapers not found');
    }

    await this.ensureNoActiveRuns(uniqueIds);

    await this.prisma.workflowConfig.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  private toScheduleData(scheduleCron: string | null | undefined): {
    schedule_cron: string | null;
    schedule_enabled: boolean;
  } {
    if (scheduleCron == null || scheduleCron === '') {
      return { schedule_cron: null, schedule_enabled: false };
    }
    return { schedule_cron: scheduleCron, schedule_enabled: true };
  }

  private async ensureWebsiteTargetBelongsToUser(
    authUser: AuthUser,
    websiteTargetId: string,
  ) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id: websiteTargetId, ...websiteTargetUserWhere(authUser) },
      select: { id: true },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }
  }

  private async ensureNoActiveRuns(workflowConfigIds: string[]) {
    const activeRun = await this.prisma.workflowRun.findFirst({
      where: {
        workflow_config_id: { in: workflowConfigIds },
        status: { in: ACTIVE_RUN_STATUSES },
      },
      select: { id: true },
    });

    if (activeRun) {
      throw new BadRequestException(
        'Cancel active runs for this scraper before deleting it',
      );
    }
  }

  private async ensureForgetModeHasSubscriber(userId: string): Promise<void> {
    const subscriberCount = await this.prisma.webhookEndpoint.count({
      where: {
        user_id: userId,
        is_active: true,
        subscribed_events: { hasSome: TERMINAL_WEBHOOK_EVENT_TYPES },
      },
    });

    if (subscriberCount === 0) {
      throw new BadRequestException(
        'persist_results: false requires an active webhook endpoint subscribed to a run-finished event (succeeded, partial_success, failed, or cancelled)',
      );
    }
  }

  private async ensureAiBatchModeSupported(
    activeVersionId: string | null,
  ): Promise<void> {
    const activeVersion = activeVersionId
      ? await this.prisma.scraperVersion.findUnique({
          where: { id: activeVersionId },
          select: { output_formats: true, extraction_schema_version_id: true },
        })
      : null;

    const hasStructuredSchema =
      !!activeVersion?.output_formats.includes(OutputFormat.STRUCTURED_JSON) &&
      !!activeVersion?.extraction_schema_version_id;

    if (!hasStructuredSchema) {
      throw new BadRequestException(
        'AI batch mode requires the active version to have STRUCTURED_JSON output with a linked schema',
      );
    }
  }

  private async ensureExists(authUser: AuthUser, id: string) {
    const scraper = await this.prisma.workflowConfig.findFirst({
      where: { id, ...workflowConfigUserWhere(authUser), type: WorkflowType.SCRAPER },
    });

    if (!scraper) {
      throw new NotFoundException('Scraper not found');
    }

    return scraper;
  }
}
