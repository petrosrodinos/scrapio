import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { websiteTargetUserWhere } from '@/shared/utils/user/user-scope.utils';
import { CreateWebsiteTargetDto } from './dto/create-website-target.dto';
import { UpdateWebsiteTargetDto } from './dto/update-website-target.dto';
import { WebsiteTargetQueryType } from './dto/website-target-query.schema';
import { PaginatedResult } from './interfaces/website-target.interface';

@Injectable()
export class WebsiteTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    authUser: AuthUser,
    query: WebsiteTargetQueryType,
  ): Promise<PaginatedResult<any>> {
    const where = {
      ...websiteTargetUserWhere(authUser, query.user_id),
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
            select: {
              workflow_configs: true,
              workflow_runs: true,
              notifications: true,
            },
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

  async findOne(authUser: AuthUser, id: string) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id, ...websiteTargetUserWhere(authUser) },
      include: {
        _count: {
          select: {
            workflow_configs: true,
            workflow_runs: true,
            notifications: true,
          },
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

  async create(authUser: AuthUser, dto: CreateWebsiteTargetDto) {
    const existing = await this.prisma.websiteTarget.findUnique({
      where: {
        user_id_base_url: {
          user_id: authUser.id,
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
        user_id: authUser.id,
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

  async update(authUser: AuthUser, id: string, dto: UpdateWebsiteTargetDto) {
    await this.ensureExists(authUser, id);

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

  async remove(authUser: AuthUser, id: string) {
    await this.ensureExists(authUser, id);

    const [scraperCount, crawlRunCount] = await Promise.all([
      this.prisma.workflowConfig.count({
        where: { website_target_id: id, type: 'SCRAPER' },
      }),
      this.prisma.workflowRun.count({
        where: { website_target_id: id, type: 'SCRAPER' },
      }),
    ]);

    if (scraperCount > 0 || crawlRunCount > 0) {
      throw new ConflictException(
        'Website target has scrapers or crawl runs and cannot be deleted',
      );
    }

    await this.prisma.websiteTarget.delete({ where: { id } });
  }

  async ensureBelongsToUser(authUser: AuthUser, id: string) {
    return this.ensureExists(authUser, id);
  }

  private async ensureExists(authUser: AuthUser, id: string) {
    const websiteTarget = await this.prisma.websiteTarget.findFirst({
      where: { id, ...websiteTargetUserWhere(authUser) },
    });

    if (!websiteTarget) {
      throw new NotFoundException('Website target not found');
    }

    return websiteTarget;
  }
}
