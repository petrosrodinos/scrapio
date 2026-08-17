import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRole, CostCategory } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { CostsService } from './costs.service';
import { CostQuerySchema, CostQueryType } from './dto/cost-query.schema';
import { CostEntryItem, CostSummaryEntity } from './entities/cost.entity';

@ApiTags('Costs')
@ApiBearerAuth()
@Controller('costs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get cost totals, broken down by category' })
  @ApiQuery({ name: 'category', required: false, enum: CostCategory })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filter by user id (admin/support only)',
  })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Cost summary',
    type: CostSummaryEntity,
  })
  getSummary(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(CostQuerySchema)) query: CostQueryType,
  ) {
    return this.costsService.getSummary(authUser, query);
  }

  @Get()
  @ApiOperation({ summary: 'List cost entries (paginated, filterable)' })
  @ApiPaginatedResponse(CostEntryItem, 'Paginated cost entry list')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Records per page (capped at 100)',
  })
  @ApiQuery({ name: 'category', required: false, enum: CostCategory })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filter by user id (admin/support only)',
  })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(CostQuerySchema)) query: CostQueryType,
  ) {
    return this.costsService.findAll(authUser, query);
  }
}
