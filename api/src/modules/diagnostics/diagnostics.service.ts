import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { GcsService } from '@/integrations/storage/gcs/services/gcs.service';
import { PaginatedResult } from '@/modules/crawl-runs/interfaces/crawl-run.interface';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { diagnosticsUserWhere } from '@/shared/utils/user/user-scope.utils';
import { Prisma } from 'generated/prisma';
import { DiagnosticsQueryType } from './dto/diagnostics-query.schema';

const ARTIFACT_URL_TTL_MINUTES = 60;

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsService: GcsService,
  ) {}

  async findAll(
    authUser: AuthUser,
    query: DiagnosticsQueryType,
  ): Promise<PaginatedResult<any>> {
    const where: Prisma.DiagnosticsPackageWhereInput = {
      ...diagnosticsUserWhere(authUser),
      ...(query.scraper_id && { scraper_id: query.scraper_id }),
      ...(query.crawl_run_id && { crawl_run_id: query.crawl_run_id }),
      ...(query.date_from || query.date_to
        ? {
            created_at: {
              ...(query.date_from && { gte: query.date_from }),
              ...(query.date_to && { lte: query.date_to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.diagnosticsPackage.findMany({
        where,
        include: {
          scraper: { select: { name: true } },
          crawl_run: { select: { website_target_id: true, status: true } },
          artifacts: { select: { kind: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.diagnosticsPackage.count({ where }),
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
    const pkg = await this.prisma.diagnosticsPackage.findFirst({
      where: { id, ...diagnosticsUserWhere(authUser) },
      include: {
        scraper: { select: { name: true } },
        crawl_run: { select: { website_target_id: true, status: true } },
        artifacts: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!pkg) {
      throw new NotFoundException('Diagnostics package not found');
    }

    const artifacts = await Promise.all(
      pkg.artifacts.map(async (artifact) => ({
        ...artifact,
        url: await this.gcsService.getSignedUrlForPath(
          artifact.path,
          ARTIFACT_URL_TTL_MINUTES,
        ),
      })),
    );

    return { ...pkg, artifacts };
  }
}
