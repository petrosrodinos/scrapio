import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { costEntryUserWhere } from '@/shared/utils/user/user-scope.utils';
import { PaginatedResult } from '@/modules/crawl-runs/interfaces/crawl-run.interface';
import { Prisma } from 'generated/prisma';
import { CostQueryType } from './dto/cost-query.schema';
import { CostSummary, RecordCostParams } from './interfaces/cost.interface';
import { CostEntryItem } from './entities/cost.entity';

const DEFAULT_CURRENCY = 'USD';

@Injectable()
export class CostsService {
  private readonly logger = new Logger(CostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generic cost recorder — any feature that incurs a metered cost (AI generation,
   * computer-use runs, future integrations) calls this instead of writing to
   * CostEntry directly. Never throws: a failed cost write must not fail the
   * operation that produced the cost.
   */
  async record(params: RecordCostParams): Promise<void> {
    try {
      await this.prisma.costEntry.create({
        data: {
          user_id: params.userId,
          category: params.category,
          provider: params.provider,
          model: params.model,
          amount: params.amount,
          currency: params.currency ?? DEFAULT_CURRENCY,
          workflow_run_id: params.workflowRunId,
          metadata: params.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record cost entry: ${error.message}`);
    }
  }

  async getSummary(
    authUser: AuthUser,
    query: CostQueryType,
  ): Promise<CostSummary> {
    const where = this.buildWhere(authUser, query);

    const grouped = await this.prisma.costEntry.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    const byCategory = grouped.map((group) => ({
      category: group.category,
      total_cost: group._sum.amount?.toNumber() ?? 0,
      entries_count: group._count._all,
    }));

    return {
      total_cost: byCategory.reduce((sum, group) => sum + group.total_cost, 0),
      currency: DEFAULT_CURRENCY,
      by_category: byCategory,
    };
  }

  async findAll(
    authUser: AuthUser,
    query: CostQueryType,
  ): Promise<PaginatedResult<CostEntryItem>> {
    const where = this.buildWhere(authUser, query);

    const [items, total] = await Promise.all([
      this.prisma.costEntry.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.costEntry.count({ where }),
    ]);

    return {
      data: items.map((item) => ({ ...item, amount: item.amount.toNumber() })),
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

  private buildWhere(
    authUser: AuthUser,
    query: CostQueryType,
  ): Prisma.CostEntryWhereInput {
    return {
      ...costEntryUserWhere(authUser, query.user_id),
      ...(query.category && { category: query.category }),
      ...((query.date_from || query.date_to) && {
        created_at: {
          ...(query.date_from && { gte: query.date_from }),
          ...(query.date_to && { lte: query.date_to }),
        },
      }),
    };
  }
}
