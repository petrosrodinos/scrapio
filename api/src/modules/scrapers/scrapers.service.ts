import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import {
  scraperUserWhere,
  websiteTargetUserWhere,
} from '@/shared/utils/user/user-scope.utils';
import {
  CrawlRunStatus,
  Prisma,
  ScraperStatus,
  ScraperVersionCreatedBy,
} from 'generated/prisma';
import { CreateScraperDto } from './dto/create-scraper.dto';
import { CreateScraperVersionDto } from './dto/create-scraper-version.dto';
import { UpdateScraperDto } from './dto/update-scraper.dto';
import { ScraperQueryType } from './dto/scraper-query.schema';
import { PaginatedResult } from './interfaces/scraper.interface';

const ACTIVE_CRAWL_RUN_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatus.QUEUED,
  CrawlRunStatus.RUNNING,
];

@Injectable()
export class ScrapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlRunsService: CrawlRunsService,
  ) {}

  async findAll(
    userId: string,
    query: ScraperQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.ScraperWhereInput = {
      ...scraperUserWhere(userId),
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
      this.prisma.scraper.findMany({
        where,
        include: { website_target: { select: { name: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.scraper.count({ where }),
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

  async findOne(userId: string, id: string) {
    const scraper = await this.prisma.scraper.findFirst({
      where: { id, ...scraperUserWhere(userId) },
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

  async create(userId: string, dto: CreateScraperDto) {
    await this.ensureWebsiteTargetBelongsToUser(
      userId,
      dto.website_target_id,
    );

    if (dto.config === undefined) {
      return this.prisma.scraper.create({
        data: {
          user_id: userId,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
          ...(dto.normalize_limit !== undefined && {
            normalize_limit: dto.normalize_limit,
          }),
        },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const scraper = await tx.scraper.create({
        data: {
          user_id: userId,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
          ...(dto.normalize_limit !== undefined && {
            normalize_limit: dto.normalize_limit,
          }),
        },
      });

      const version = await tx.scraperVersion.create({
        data: {
          scraper_id: scraper.id,
          version: 1,
          config: dto.config as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.USER,
        },
      });

      return tx.scraper.update({
        where: { id: scraper.id },
        data: { active_version_id: version.id, version_count: 1 },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    });
  }

  async listVersions(userId: string, scraperId: string) {
    await this.ensureExists(userId, scraperId);

    return this.prisma.scraperVersion.findMany({
      where: { scraper_id: scraperId },
      orderBy: { version: 'desc' },
    });
  }

  async createVersion(
    userId: string,
    scraperId: string,
    dto: CreateScraperVersionDto,
  ) {
    await this.ensureExists(userId, scraperId);

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.scraperVersion.findFirst({
        where: { scraper_id: scraperId },
        orderBy: { version: 'desc' },
      });

      const version = await tx.scraperVersion.create({
        data: {
          scraper_id: scraperId,
          version: (latest?.version ?? 0) + 1,
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          notes: dto.notes,
          created_by: ScraperVersionCreatedBy.USER,
        },
      });

      await tx.scraper.update({
        where: { id: scraperId },
        data: { version_count: { increment: 1 } },
      });

      return version;
    });
  }

  async activateVersion(userId: string, scraperId: string, versionId: string) {
    const scraper = await this.ensureExists(userId, scraperId);

    const version = await this.prisma.scraperVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.scraper_id !== scraperId) {
      throw new NotFoundException('Version not found for this scraper');
    }

    return this.prisma.scraper.update({
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

  async update(userId: string, id: string, dto: UpdateScraperDto) {
    const scraper = await this.ensureExists(userId, id);

    if (dto.validation_rules === undefined) {
      return this.prisma.scraper.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.self_healing_enabled !== undefined && {
            self_healing_enabled: dto.self_healing_enabled,
          }),
          ...(dto.diagnostics_mode !== undefined && {
            diagnostics_mode: dto.diagnostics_mode,
          }),
          ...(dto.normalize_limit !== undefined && {
            normalize_limit: dto.normalize_limit,
          }),
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
        where: { scraper_id: id },
        orderBy: { version: 'desc' },
      });

      const newVersion = await tx.scraperVersion.create({
        data: {
          scraper_id: id,
          version: (latest?.version ?? 0) + 1,
          config: {
            ...((activeVersion?.config as Record<string, unknown>) ?? {}),
            validation_rules: dto.validation_rules,
          } as Prisma.InputJsonValue,
          created_by: ScraperVersionCreatedBy.USER,
          notes: 'Updated validation_rules',
        },
      });

      return tx.scraper.update({
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
          ...(dto.normalize_limit !== undefined && {
            normalize_limit: dto.normalize_limit,
          }),
        },
        include: {
          active_version: true,
          website_target: { select: { name: true } },
        },
      });
    });
  }

  async runNow(userId: string, id: string) {
    const scraper = await this.ensureExists(userId, id);

    return this.crawlRunsService.enqueue(
      scraper.website_target_id,
      scraper.id,
    );
  }

  async remove(userId: string, id: string) {
    await this.ensureExists(userId, id);
    await this.ensureNoActiveCrawlRuns([id]);

    await this.prisma.scraper.delete({ where: { id } });
  }

  async removeMany(userId: string, scraperIds: string[]) {
    const uniqueIds = [...new Set(scraperIds)];
    const count = await this.prisma.scraper.count({
      where: { id: { in: uniqueIds }, ...scraperUserWhere(userId) },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more scrapers not found');
    }

    await this.ensureNoActiveCrawlRuns(uniqueIds);

    await this.prisma.scraper.deleteMany({
      where: { id: { in: uniqueIds } },
    });

    return { deleted: uniqueIds.length };
  }

  private async ensureWebsiteTargetBelongsToUser(
    userId: string,
    websiteTargetId: string,
  ) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id: websiteTargetId, ...websiteTargetUserWhere(userId) },
      select: { id: true },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }
  }

  private async ensureNoActiveCrawlRuns(scraperIds: string[]) {
    const activeRun = await this.prisma.crawlRun.findFirst({
      where: {
        scraper_id: { in: scraperIds },
        status: { in: ACTIVE_CRAWL_RUN_STATUSES },
      },
      select: { id: true },
    });

    if (activeRun) {
      throw new BadRequestException(
        'Cancel active crawl runs for this scraper before deleting it',
      );
    }
  }

  private async ensureExists(userId: string, id: string) {
    const scraper = await this.prisma.scraper.findFirst({
      where: { id, ...scraperUserWhere(userId) },
    });

    if (!scraper) {
      throw new NotFoundException('Scraper not found');
    }

    return scraper;
  }
}
