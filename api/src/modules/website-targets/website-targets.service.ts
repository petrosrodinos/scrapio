import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { websiteTargetUserWhere } from '@/shared/utils/user/user-scope.utils';
import { CreateWebsiteTargetDto } from './dto/create-website-target.dto';
import { UpdateWebsiteTargetDto } from './dto/update-website-target.dto';
import { WebsiteTargetQueryType } from './dto/website-target-query.schema';
import { PaginatedResult } from './interfaces/website-target.interface';

@Injectable()
export class WebsiteTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: WebsiteTargetQueryType,
  ): Promise<PaginatedResult<any>> {
    const where = {
      ...websiteTargetUserWhere(userId),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          {
            base_url: { contains: query.search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.websiteTarget.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { scrapers: true, crawl_runs: true, notifications: true },
          },
        },
      }),
      this.prisma.websiteTarget.count({ where }),
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
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id, ...websiteTargetUserWhere(userId) },
      include: {
        _count: {
          select: { scrapers: true, crawl_runs: true, notifications: true },
        },
        block_rules: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }

    return websiteTarget;
  }

  async create(userId: string, dto: CreateWebsiteTargetDto) {
    const existing = await this.prisma.websiteTarget.findUnique({
      where: {
        user_id_base_url: {
          user_id: userId,
          base_url: dto.base_url,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A website target with this base_url already exists',
      );
    }

    const { block_rules, ...rest } = dto;

    return this.prisma.websiteTarget.create({
      data: {
        ...rest,
        user_id: userId,
        ...(block_rules?.length && {
          block_rules: {
            create: block_rules.map((rule, index) => ({
              ...rule,
              position: index,
            })),
          },
        }),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateWebsiteTargetDto) {
    await this.ensureExists(userId, id);

    const { block_rules, ...rest } = dto;

    return this.prisma.websiteTarget.update({
      where: { id },
      data: {
        ...rest,
        ...(block_rules !== undefined && {
          block_rules: {
            deleteMany: {},
            create: block_rules.map((rule, index) => ({
              ...rule,
              position: index,
            })),
          },
        }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureExists(userId, id);

    const [scraperCount, crawlRunCount] = await Promise.all([
      this.prisma.scraper.count({ where: { website_target_id: id } }),
      this.prisma.crawlRun.count({ where: { website_target_id: id } }),
    ]);

    if (scraperCount > 0 || crawlRunCount > 0) {
      throw new ConflictException(
        'Website target has scrapers or crawl runs and cannot be deleted',
      );
    }

    await this.prisma.websiteTarget.delete({ where: { id } });
  }

  async ensureBelongsToUser(userId: string, id: string) {
    return this.ensureExists(userId, id);
  }

  private async ensureExists(userId: string, id: string) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id, ...websiteTargetUserWhere(userId) },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }

    return websiteTarget;
  }
}
