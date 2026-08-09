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
  workflowConfigUserWhere,
  websiteTargetUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  AuthRole,
  GenerationRunStatus,
  GenerationTrigger,
  IntegrationType,
  OutputFormat,
  Prisma,
  ScraperStatus,
  ScraperVersionCreatedBy,
  WorkflowType,
} from 'generated/prisma';
import { CreateGenerationRunDto } from './dto/create-generation-run.dto';
import { RejectGenerationRunDto } from './dto/reject-generation-run.dto';
import { RetryGenerationRunDto } from './dto/retry-generation-run.dto';
import { GenerationRunQueryType } from './dto/generation-run-query.schema';
import { getOutputSchemaDefinitionError } from './dto/output-schema.schema';
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
      ...(query.workflow_config_id && {
        workflow_config_id: query.workflow_config_id,
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.scraperGenerationRun.findMany({
        where,
        include: {
          website_target: { select: { name: true } },
          workflow_config: { select: { name: true } },
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
        workflow_config: { select: { name: true } },
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

    if (dto.scraper_id) {
      await this.ensureWorkflowConfigBelongsToUser(authUser, dto.scraper_id);
    }

    this.validateOutputConfig(dto.output_formats, dto.output_schema);

    if (dto.start) {
      await this.ensureAnthropicComputerUse(websiteTarget.user_id);
    }

    const run = await this.prisma.scraperGenerationRun.create({
      data: {
        website_target_id: dto.website_target_id,
        workflow_config_id: dto.scraper_id ?? null,
        trigger: GenerationTrigger.MANUAL,
        status: dto.start
          ? GenerationRunStatus.QUEUED
          : GenerationRunStatus.DRAFT,
        prompt: dto.prompt,
        max_steps: dto.max_steps ?? null,
        output_formats: dto.output_formats,
        output_schema: dto.output_schema
          ? (dto.output_schema as Prisma.InputJsonValue)
          : null,
      },
    });

    if (dto.start) {
      await this.enqueueGenerationJob(run.id, { runId: run.id });
    }

    return run;
  }

  async start(authUser: AuthUser, id: string) {
    const run = await this.ensureExists(authUser, id);

    if (run.status !== GenerationRunStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT generation runs can be started');
    }

    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: {
        id: run.website_target_id,
        ...websiteTargetUserWhere(authUser),
      },
      select: { user_id: true },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }

    await this.ensureAnthropicComputerUse(websiteTarget.user_id);

    const updated = await this.prisma.scraperGenerationRun.updateMany({
      where: { id, status: GenerationRunStatus.DRAFT },
      data: { status: GenerationRunStatus.QUEUED },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Only DRAFT generation runs can be started');
    }

    await this.enqueueGenerationJob(id, { runId: id });

    return this.prisma.scraperGenerationRun.findUniqueOrThrow({ where: { id } });
  }

  private async ensureAnthropicComputerUse(userId: string): Promise<void> {
    const hasAnthropicComputerUse =
      await this.credentialResolver.hasResolvableCredentials({
        userId,
        integrationType: IntegrationType.ANTHROPIC,
      });

    if (!hasAnthropicComputerUse) {
      throw new BadRequestException(
        'No active Anthropic computer use integration configured for this user',
      );
    }
  }

  async trigger(
    websiteTargetId: string,
    workflowConfigId: string | null,
    trigger: GenerationTrigger,
    prompt?: string,
    maxSteps?: number,
  ) {
    const run = await this.prisma.scraperGenerationRun.create({
      data: {
        website_target_id: websiteTargetId,
        workflow_config_id: workflowConfigId,
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
      const websiteTarget = await tx.websiteTarget.findUniqueOrThrow({
        where: { id: run.website_target_id },
      });

      const outputFormats =
        (run.output_formats ?? []).length > 0
          ? run.output_formats
          : [OutputFormat.MARKDOWN];

      let workflowConfigId = run.workflow_config_id;
      let extractionSchemaVersionId: string | null = null;

      if (
        outputFormats.includes(OutputFormat.STRUCTURED_JSON) &&
        run.output_schema
      ) {
        const schemaName = workflowConfigId
          ? (await tx.workflowConfig.findUniqueOrThrow({
              where: { id: workflowConfigId },
              select: { name: true },
            })).name
          : `${websiteTarget.name} scraper`;

        extractionSchemaVersionId = await this.createExtractionSchemaVersion(
          tx,
          websiteTarget.user_id,
          schemaName,
          run.output_schema as Prisma.InputJsonValue,
        );
      }

      if (!workflowConfigId) {
        const createdConfig = await tx.workflowConfig.create({
          data: {
            user_id: websiteTarget.user_id,
            type: WorkflowType.SCRAPER,
            website_target_id: run.website_target_id,
            name: `${websiteTarget.name} scraper`,
            status: ScraperStatus.TESTING,
            urls: [],
            output_formats: outputFormats,
            extraction_schema_version_id: extractionSchemaVersionId,
          },
        });

        workflowConfigId = createdConfig.id;
      }

      const config = await tx.workflowConfig.findUniqueOrThrow({
        where: { id: workflowConfigId },
      });

      const latestVersion = await tx.scraperVersion.findFirst({
        where: { workflow_config_id: workflowConfigId },
        orderBy: { version: 'desc' },
      });

      const version = await tx.scraperVersion.create({
        data: {
          workflow_config_id: workflowConfigId,
          version: (latestVersion?.version ?? 0) + 1,
          config: run.staged_config as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.AI,
          notes: `Generated via ${run.trigger} run ${run.id}`,
          generation_prompt: run.prompt,
          output_formats: outputFormats,
          extraction_schema_version_id: extractionSchemaVersionId,
        },
      });

      await tx.workflowConfig.update({
        where: { id: workflowConfigId },
        data: {
          active_version_id: version.id,
          version_count: { increment: 1 },
          output_formats: outputFormats,
          extraction_schema_version_id: extractionSchemaVersionId,
          ...(config.status === ScraperStatus.BROKEN && {
            status: ScraperStatus.ACTIVE,
          }),
        },
      });

      const finishedAt = new Date();
      return tx.scraperGenerationRun.update({
        where: { id },
        data: {
          workflow_config_id: workflowConfigId,
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
        workflow_config: { select: { self_healing_enabled: true } },
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
      run.workflow_config_id &&
      run.trigger === GenerationTrigger.SELF_HEAL &&
      run.workflow_config &&
      !run.workflow_config.self_healing_enabled
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
    workflowConfigId: string,
    error: string,
    prompt?: string,
  ) {
    const run = await this.prisma.scraperGenerationRun.findFirst({
      where: {
        workflow_config_id: workflowConfigId,
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

  private async ensureWorkflowConfigBelongsToUser(
    authUser: AuthUser,
    workflowConfigId: string,
  ) {
    const config = await this.prisma.workflowConfig.findFirst({
      where: { id: workflowConfigId, ...workflowConfigUserWhere(authUser) },
      select: { id: true },
    });

    if (!config) {
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

  private validateOutputConfig(
    outputFormats: OutputFormat[],
    outputSchema?: Record<string, unknown>,
  ): void {
    if (!outputFormats?.length) {
      throw new BadRequestException('At least one output format is required');
    }

    if (!outputFormats.includes(OutputFormat.STRUCTURED_JSON)) {
      return;
    }

    if (!outputSchema || Object.keys(outputSchema).length === 0) {
      throw new BadRequestException(
        'output_schema is required when STRUCTURED_JSON is selected',
      );
    }

    const schemaError = getOutputSchemaDefinitionError(outputSchema);
    if (schemaError) {
      throw new BadRequestException(schemaError);
    }
  }

  private async createExtractionSchemaVersion(
    tx: Prisma.TransactionClient,
    userId: string,
    schemaName: string,
    definition: Prisma.InputJsonValue,
  ): Promise<string> {
    const schema = await tx.extractionSchema.create({
      data: {
        user_id: userId,
        name: `${schemaName} output schema`,
        versions: {
          create: {
            version: 1,
            definition,
          },
        },
      },
      include: { versions: true },
    });

    const version = schema.versions[0];

    await tx.extractionSchema.update({
      where: { id: schema.id },
      data: {
        active_version_id: version.id,
        version_count: 1,
      },
    });

    return version.id;
  }
}
