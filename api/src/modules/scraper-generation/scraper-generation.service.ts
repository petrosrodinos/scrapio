import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { GcsService } from '@/integrations/storage/gcs/services/gcs.service';
import { GENERATION_QUEUE } from '@/core/queues/queues.constants';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import {
  generationRunUserWhere,
  scraperUserWhere,
  websiteTargetUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  AuthRole,
  GenerationRunStatus,
  GenerationTrigger,
  IntegrationType,
  Prisma,
  ScraperStatus,
  ScraperVersionCreatedBy,
} from 'generated/prisma';
import { CreateGenerationRunDto } from './dto/create-generation-run.dto';
import { RejectGenerationRunDto } from './dto/reject-generation-run.dto';
import { RetryGenerationRunDto } from './dto/retry-generation-run.dto';
import { GenerationRunQueryType } from './dto/generation-run-query.schema';
import { PaginatedResult } from './interfaces/generation-run.interface';
import { IntegrationCredentialResolverService } from '@/integrations/credentials/services/integration-credential-resolver.service';

const TERMINAL_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatus.SUCCESS,
  GenerationRunStatus.FAILED,
  GenerationRunStatus.CANCELLED,
];

const ACTIVE_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatus.QUEUED,
  GenerationRunStatus.RUNNING,
];

const RETRYABLE_STATUSES: GenerationRunStatus[] = [
  GenerationRunStatus.FAILED,
  GenerationRunStatus.CANCELLED,
];

@Injectable()
export class ScraperGenerationService {
  private readonly logger = new Logger(ScraperGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsService: GcsService,
    private readonly credentialResolver: IntegrationCredentialResolverService,
    @InjectQueue(GENERATION_QUEUE) private readonly generationQueue: Queue,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: GenerationRunQueryType,
  ): Promise<PaginatedResult<any>> {
    const where = {
      ...generationRunUserWhere(authUser, query.user_id),
      ...(query.status && { status: query.status }),
      ...(query.trigger && { trigger: query.trigger }),
      ...(query.website_target_id && {
        website_target_id: query.website_target_id,
      }),
      ...(query.scraper_id && { scraper_id: query.scraper_id }),
    };

    const [items, total] = await Promise.all([
      this.prisma.scraperGenerationRun.findMany({
        where,
        include: {
          website_target: { select: { name: true } },
          scraper: { select: { name: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.scraperGenerationRun.count({ where }),
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
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: { id, ...generationRunUserWhere(authUser) },
      include: {
        website_target: { select: { name: true } },
        scraper: { select: { name: true } },
        steps: {
          orderBy: { step_index: 'asc' },
          include: {
            screenshot_before: { select: { url: true } },
            screenshot_after: { select: { url: true } },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Generation run not found');
    }

    return {
      ...run,
      // The frontend replay view renders images directly; resolve Document ids to their
      // GCS urls here instead of making it fetch each screenshot by id itself.
      steps: run.steps.map(
        ({
          screenshot_before,
          screenshot_after,
          screenshot_before_id,
          screenshot_after_id,
          ...step
        }) => ({
          ...step,
          screenshot_before_url: screenshot_before?.url ?? null,
          screenshot_after_url: screenshot_after?.url ?? null,
        }),
      ),
    };
  }

  async create(authUser: AuthUser, dto: CreateGenerationRunDto) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id: dto.website_target_id, ...websiteTargetUserWhere(authUser) },
      select: { id: true, user_id: true },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }

    const hasAnthropicCredentials =
      await this.credentialResolver.hasResolvableCredentials({
        userId: websiteTarget.user_id,
        integrationType: IntegrationType.ANTHROPIC,
      });

    if (!hasAnthropicCredentials) {
      throw new BadRequestException(
        'No active Anthropic integration configured for this user',
      );
    }

    if (dto.scraper_id) {
      await this.ensureScraperBelongsToUser(authUser, dto.scraper_id);
    }

    const run = await this.prisma.scraperGenerationRun.create({
      data: {
        website_target_id: dto.website_target_id,
        scraper_id: dto.scraper_id,
        trigger: GenerationTrigger.MANUAL,
        status: GenerationRunStatus.QUEUED,
        prompt: dto.prompt,
        max_steps: dto.max_steps ?? null,
      },
    });

    await this.enqueueGenerationJob(run.id, { runId: run.id });

    return run;
  }

  async trigger(
    websiteTargetId: string,
    scraperId: string | null,
    trigger: GenerationTrigger,
    prompt?: string,
    maxSteps?: number,
  ) {
    const run = await this.prisma.scraperGenerationRun.create({
      data: {
        website_target_id: websiteTargetId,
        scraper_id: scraperId,
        trigger,
        status: GenerationRunStatus.QUEUED,
        prompt,
        max_steps: maxSteps ?? null,
      },
    });

    await this.enqueueGenerationJob(run.id, { runId: run.id });

    return run;
  }

  async approve(authUser: AuthUser, id: string) {
    const run = await this.ensureExists(authUser, id);

    if (
      run.status !== GenerationRunStatus.AWAITING_REVIEW ||
      !run.staged_config
    ) {
      throw new BadRequestException(
        'Run must be AWAITING_REVIEW with a staged config to approve',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let scraperId = run.scraper_id;

      if (!scraperId) {
        const websiteTarget = await tx.websiteTarget.findUniqueOrThrow({
          where: { id: run.website_target_id },
        });

        const scraper = await tx.scraper.create({
          data: {
            user_id: websiteTarget.user_id,
            website_target_id: run.website_target_id,
            name: `${websiteTarget.name} scraper`,
            status: ScraperStatus.TESTING,
          },
        });

        scraperId = scraper.id;
      }

      const scraper = await tx.scraper.findUniqueOrThrow({
        where: { id: scraperId },
      });

      const latestVersion = await tx.scraperVersion.findFirst({
        where: { scraper_id: scraperId },
        orderBy: { version: 'desc' },
      });

      const version = await tx.scraperVersion.create({
        data: {
          scraper_id: scraperId,
          version: (latestVersion?.version ?? 0) + 1,
          config: run.staged_config as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.AI,
          notes: `Generated via ${run.trigger} run ${run.id}`,
        },
      });

      await tx.scraper.update({
        where: { id: scraperId },
        data: {
          active_version_id: version.id,
          version_count: { increment: 1 },
          ...(scraper.status === ScraperStatus.BROKEN && {
            status: ScraperStatus.ACTIVE,
          }),
        },
      });

      const finishedAt = new Date();
      return tx.scraperGenerationRun.update({
        where: { id },
        data: {
          scraper_id: scraperId,
          produced_version_id: version.id,
          status: GenerationRunStatus.SUCCESS,
          finished_at: finishedAt,
          duration_ms: run.started_at
            ? finishedAt.getTime() - run.started_at.getTime()
            : null,
        },
        include: { steps: { orderBy: { step_index: 'asc' } } },
      });
    });
  }

  async reject(authUser: AuthUser, id: string, dto: RejectGenerationRunDto) {
    const run = await this.ensureExists(authUser, id);

    if (TERMINAL_STATUSES.includes(run.status)) {
      throw new BadRequestException('Run has already finished');
    }

    const finishedAt = new Date();
    return this.prisma.scraperGenerationRun.update({
      where: { id },
      data: {
        status: GenerationRunStatus.FAILED,
        error_message: dto.reason ?? 'Rejected by admin',
        finished_at: finishedAt,
        duration_ms: run.started_at
          ? finishedAt.getTime() - run.started_at.getTime()
          : null,
      },
    });
  }

  async cancel(authUser: AuthUser, id: string) {
    const run = await this.ensureExists(authUser, id);

    if (!ACTIVE_STATUSES.includes(run.status)) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING runs can be cancelled',
      );
    }

    try {
      const job = await this.generationQueue.getJob(id);
      if (job) {
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed' || state === 'prioritized') {
          await job.remove();
        }
      } else {
        await this.generationQueue.remove(id).catch(() => undefined);
      }
    } catch (error) {
      this.logger.warn(
        `generation cancel ${id}: failed to remove queue job: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const finishedAt = new Date();
    const cancelled = await this.prisma.scraperGenerationRun.updateMany({
      where: {
        id,
        status: { in: ACTIVE_STATUSES },
      },
      data: {
        status: GenerationRunStatus.CANCELLED,
        finished_at: finishedAt,
        duration_ms: run.started_at
          ? finishedAt.getTime() - run.started_at.getTime()
          : null,
        error_message: 'Cancelled by admin',
      },
    });

    if (cancelled.count === 0) {
      throw new BadRequestException(
        'Only QUEUED or RUNNING runs can be cancelled',
      );
    }

    return this.prisma.scraperGenerationRun.findUniqueOrThrow({
      where: { id },
    });
  }

  async retry(authUser: AuthUser, id: string, dto: RetryGenerationRunDto) {
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: { id, ...generationRunUserWhere(authUser) },
      include: {
        steps: { select: { id: true } },
        scraper: { select: { self_healing_enabled: true } },
      },
    });

    if (!run) {
      throw new NotFoundException('Generation run not found');
    }

    if (!RETRYABLE_STATUSES.includes(run.status)) {
      throw new BadRequestException(
        'Only FAILED or CANCELLED runs can be retried',
      );
    }

    if (
      run.scraper_id &&
      run.trigger === GenerationTrigger.SELF_HEAL &&
      run.scraper &&
      !run.scraper.self_healing_enabled
    ) {
      throw new BadRequestException(
        'Self-healing is disabled for this scraper',
      );
    }

    const retryError = dto.error?.trim() || run.error_message || undefined;
    const retryPrompt = dto.prompt?.trim();
    const mergedPrompt = retryPrompt
      ? [run.prompt?.trim(), retryPrompt].filter(Boolean).join('\n\n')
      : run.prompt;

    const updated = await this.prisma.scraperGenerationRun.update({
      where: { id },
      data: {
        status: GenerationRunStatus.QUEUED,
        error_message: null,
        finished_at: null,
        duration_ms: null,
        staged_config: null,
        prompt: mergedPrompt,
        ...(dto.max_steps != null && { max_steps: dto.max_steps }),
      },
    });

    await this.enqueueGenerationJob(id, {
      runId: id,
      resume: run.steps.length > 0,
      retryError,
      retryPrompt,
    });

    return updated;
  }

  async retryLatestForScraper(
    scraperId: string,
    error: string,
    prompt?: string,
  ) {
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: {
        scraper_id: scraperId,
        status: { in: RETRYABLE_STATUSES },
        steps: { some: {} },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!run) {
      return null;
    }

    const websiteTarget = await this.prisma.websiteTarget.findUnique({
      where: { id: run.website_target_id },
      select: { user_id: true },
    });

    if (!websiteTarget) {
      return null;
    }

    return this.retry(
      { id: websiteTarget.user_id, role: AuthRole.USER },
      run.id,
      { error, prompt },
    );
  }

  async remove(authUser: AuthUser, id: string) {
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: { id, ...generationRunUserWhere(authUser) },
      include: {
        steps: {
          select: {
            screenshot_before_id: true,
            screenshot_after_id: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Generation run not found');
    }

    if (ACTIVE_STATUSES.includes(run.status)) {
      throw new BadRequestException(
        'Cancel the generation run before deleting it',
      );
    }

    const documentIds = this.collectScreenshotDocumentIds(run.steps);

    const documents =
      documentIds.length > 0
        ? await this.prisma.document.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, path: true },
          })
        : [];

    await Promise.all(
      documents.map(async (document) => {
        try {
          await this.gcsService.deleteImageByPath(document.path);
        } catch (error) {
          this.logger.warn(
            `Failed to delete GCS object for document ${document.id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.scraperGenerationRun.delete({ where: { id } });

      if (documents.length > 0) {
        await tx.document.deleteMany({
          where: { id: { in: documents.map((document) => document.id) } },
        });
      }
    });
  }

  private collectScreenshotDocumentIds(
    steps: {
      screenshot_before_id: string | null;
      screenshot_after_id: string | null;
    }[],
  ): string[] {
    const ids = new Set<string>();

    for (const step of steps) {
      if (step.screenshot_before_id) {
        ids.add(step.screenshot_before_id);
      }
      if (step.screenshot_after_id) {
        ids.add(step.screenshot_after_id);
      }
    }

    return [...ids];
  }

  private async enqueueGenerationJob(
    jobId: string,
    data: {
      runId: string;
      resume?: boolean;
      retryError?: string;
      retryPrompt?: string;
    },
  ): Promise<void> {
    const existing = await this.generationQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state !== 'active') {
        await existing.remove().catch(() => undefined);
      }
    }

    await this.generationQueue.add('generate', data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
    });
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

  private async ensureScraperBelongsToUser(
    authUser: AuthUser,
    scraperId: string,
  ) {
    const scraper = await this.prisma.scraper.findFirst({
      where: { id: scraperId, ...scraperUserWhere(authUser) },
      select: { id: true },
    });

    if (!scraper) {
      throw new NotFoundException('Scraper not found');
    }
  }

  private async ensureExists(authUser: AuthUser, id: string) {
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: { id, ...generationRunUserWhere(authUser) },
    });

    if (!run) {
      throw new NotFoundException('Generation run not found');
    }

    return run;
  }
}
