import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import { ExtractionSchemaVersioningService } from '@/modules/extraction-schemas/extraction-schema-versioning.service';
import { getOutputSchemaDefinitionError } from '@/modules/scraper-generation/dto/output-schema.schema';
import { TERMINAL_WEBHOOK_EVENT_TYPES } from '@/modules/webhooks/constants/webhook-event-catalog.constant';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { workflowConfigUserWhere } from '@/shared/utils/user/user-scope.utils';
import { PaginatedResult } from '@/shared/interfaces/paginated-result.interface';
import {
  OutputFormat,
  Prisma,
  RunStatus,
  WorkflowType,
} from 'generated/prisma';
import { CreateBrowserAgentConfigDto } from './dto/create-browser-agent-config.dto';
import { UpdateBrowserAgentConfigDto } from './dto/update-browser-agent-config.dto';
import { BrowserAgentConfigQueryType } from './dto/browser-agent-config-query.schema';

const ACTIVE_RUN_STATUSES: RunStatus[] = [RunStatus.QUEUED, RunStatus.RUNNING];

@Injectable()
export class BrowserAgentConfigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlRunsService: CrawlRunsService,
    private readonly schemaVersioning: ExtractionSchemaVersioningService,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: BrowserAgentConfigQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.WorkflowConfigWhereInput = {
      ...workflowConfigUserWhere(authUser, query.user_id),
      type: WorkflowType.BROWSER_AGENT,
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.workflowConfig.findMany({
        where,
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
    const config = await this.ensureExists(authUser, id);
    return this.prisma.workflowConfig.findUniqueOrThrow({
      where: { id: config.id },
      include: {
        extraction_schema_version: true,
      },
    });
  }

  async create(authUser: AuthUser, dto: CreateBrowserAgentConfigDto) {
    const outputFormats = dto.output_formats ?? [];
    this.validateOutputFormats(outputFormats, dto.output_schema);

    if (dto.persist_results === false) {
      await this.ensureForgetModeHasSubscriber(authUser.id);
    }

    const extractionSchemaVersionId =
      await this.schemaVersioning.syncForConfig({
        userId: authUser.id,
        schemaName: `${dto.name} schema`,
        wantsStructured: outputFormats.includes(OutputFormat.STRUCTURED_JSON),
        definition: dto.output_schema ?? null,
      });

    if (dto.ai_batch_mode === true) {
      this.validateAiBatchMode(outputFormats, extractionSchemaVersionId);
    }

    return this.prisma.workflowConfig.create({
      data: {
        user_id: authUser.id,
        type: WorkflowType.BROWSER_AGENT,
        name: dto.name,
        description: dto.description ?? null,
        url: dto.url,
        max_steps: dto.max_steps,
        urls: [],
        output_formats: outputFormats,
        extraction_schema_version_id: extractionSchemaVersionId,
        persist_results: dto.persist_results ?? true,
        ai_batch_mode: dto.ai_batch_mode ?? false,
        ...this.toScheduleData(dto.schedule_cron),
      },
    });
  }

  async update(authUser: AuthUser, id: string, dto: UpdateBrowserAgentConfigDto) {
    const config = await this.ensureExists(authUser, id);

    if (dto.persist_results === false) {
      await this.ensureForgetModeHasSubscriber(authUser.id);
    }

    const outputFormats =
      dto.output_formats ?? (config.output_formats as OutputFormat[]);
    const wantsStructured = outputFormats.includes(OutputFormat.STRUCTURED_JSON);

    if (dto.output_formats !== undefined) {
      this.validateOutputFormats(outputFormats, dto.output_schema);
    }

    let extractionSchemaVersionId = config.extraction_schema_version_id;
    if (dto.output_schema !== undefined) {
      extractionSchemaVersionId = await this.schemaVersioning.syncForConfig({
        userId: authUser.id,
        schemaName: `${dto.name ?? config.name} schema`,
        wantsStructured,
        definition: dto.output_schema,
        currentVersionId: config.extraction_schema_version_id,
      });
    } else if (dto.output_formats !== undefined && !wantsStructured) {
      extractionSchemaVersionId = null;
    }

    const effectiveAiBatchMode = dto.ai_batch_mode ?? config.ai_batch_mode;
    if (effectiveAiBatchMode) {
      this.validateAiBatchMode(outputFormats, extractionSchemaVersionId);
    }

    const schedule =
      dto.schedule_cron !== undefined
        ? this.toScheduleData(dto.schedule_cron)
        : undefined;

    return this.prisma.workflowConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.max_steps !== undefined && { max_steps: dto.max_steps }),
        ...(dto.output_formats !== undefined && { output_formats: outputFormats }),
        extraction_schema_version_id: extractionSchemaVersionId,
        ...(dto.persist_results !== undefined && { persist_results: dto.persist_results }),
        ...(dto.ai_batch_mode !== undefined && { ai_batch_mode: dto.ai_batch_mode }),
        ...schedule,
      },
    });
  }

  async runNow(authUser: AuthUser, id: string) {
    await this.ensureExists(authUser, id);
    return this.crawlRunsService.enqueueBrowserAgent(id);
  }

  async remove(authUser: AuthUser, id: string) {
    await this.ensureExists(authUser, id);
    await this.ensureNoActiveRuns([id]);
    await this.prisma.workflowConfig.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const count = await this.prisma.workflowConfig.count({
      where: {
        id: { in: uniqueIds },
        ...workflowConfigUserWhere(authUser),
        type: WorkflowType.BROWSER_AGENT,
      },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more browser agent configs not found');
    }

    await this.ensureNoActiveRuns(uniqueIds);

    await this.prisma.workflowConfig.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  private validateOutputFormats(
    outputFormats: OutputFormat[],
    schema: Record<string, unknown> | undefined,
  ): void {
    if (outputFormats.length === 0) {
      throw new BadRequestException(
        'output_formats must include at least one of STRUCTURED_JSON, MARKDOWN',
      );
    }

    if (!outputFormats.includes(OutputFormat.STRUCTURED_JSON)) {
      return;
    }

    if (!schema) {
      throw new BadRequestException(
        'output_schema is required when output_formats includes STRUCTURED_JSON',
      );
    }

    const error = getOutputSchemaDefinitionError(schema);
    if (error) {
      throw new BadRequestException(error);
    }
  }

  private validateAiBatchMode(
    outputFormats: OutputFormat[],
    extractionSchemaVersionId: string | null,
  ): void {
    if (!outputFormats.includes(OutputFormat.STRUCTURED_JSON) || !extractionSchemaVersionId) {
      throw new BadRequestException(
        'AI batch mode requires a structured JSON output schema',
      );
    }
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
        'Cancel active runs for this config before deleting it',
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

  private async ensureExists(authUser: AuthUser, id: string) {
    const config = await this.prisma.workflowConfig.findFirst({
      where: {
        id,
        ...workflowConfigUserWhere(authUser),
        type: WorkflowType.BROWSER_AGENT,
      },
    });

    if (!config) {
      throw new NotFoundException('Browser agent config not found');
    }

    return config;
  }
}
