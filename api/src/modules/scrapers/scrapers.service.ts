import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CrawlRunsService } from '@/modules/crawl-runs/crawl-runs.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
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
    authUser: AuthUser,
    query: ScraperQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.ScraperWhereInput = {
      ...scraperUserWhere(authUser, query.user_id),
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

  async findOne(authUser: AuthUser, id: string) {
    const scraper = await this.prisma.scraper.findFirst({
      where: { id, ...scraperUserWhere(authUser) },
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

    if (dto.config === undefined) {
      return this.prisma.scraper.create({
        data: {
          user_id: authUser.id,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
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
          user_id: authUser.id,
          website_target_id: dto.website_target_id,
          name: dto.name,
          status: ScraperStatus.TESTING,
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

  async listVersions(authUser: AuthUser, scraperId: string) {
    await this.ensureExists(authUser, scraperId);

    return this.prisma.scraperVersion.findMany({
      where: { scraper_id: scraperId },
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

  async activateVersion(
    authUser: AuthUser,
    scraperId: string,
    versionId: string,
  ) {
    const scraper = await this.ensureExists(authUser, scraperId);

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

  async update(authUser: AuthUser, id: string, dto: UpdateScraperDto) {
    const scraper = await this.ensureExists(authUser, id);

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
      scraper.website_target_id,
      scraper.id,
    );
  }

  async remove(authUser: AuthUser, id: string) {
    await this.ensureExists(authUser, id);
    await this.ensureNoActiveCrawlRuns([id]);

    await this.prisma.scraper.delete({ where: { id } });
  }

  async removeMany(authUser: AuthUser, scraperIds: string[]) {
    const uniqueIds = [...new Set(scraperIds)];
    const count = await this.prisma.scraper.count({
      where: { id: { in: uniqueIds }, ...scraperUserWhere(authUser) },
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

  private async ensureExists(authUser: AuthUser, id: string) {
    const scraper = await this.prisma.scraper.findFirst({
      where: { id, ...scraperUserWhere(authUser) },
    });

    if (!scraper) {
      throw new NotFoundException('Scraper not found');
    }

    return scraper;
  }
}
