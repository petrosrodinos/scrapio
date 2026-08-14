import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { DashboardService } from './dashboard.service';
import {
  DashboardQuerySchema,
  DashboardQueryType,
} from './dto/dashboard-query.schema';
import { Dashboard } from './entities/dashboard.entity';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
  @ApiOperation({
    summary: 'Get user-scoped dashboard KPIs and activity feed',
    description:
      'Returns scraper/crawl/queue KPIs and a recent activity feed scoped to the caller.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs and activity feed', type: Dashboard })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description:
      'Admin/Support only: view another user\'s dashboard by their user id. Ignored (always scoped to the caller) for regular users.',
  })
  getDashboard(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(DashboardQuerySchema)) query: DashboardQueryType,
  ) {
    return this.dashboardService.getDashboard(authUser, query);
  }

  @Get('admin/dashboard')
  @Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
  @ApiOperation({
    summary: 'Get admin dashboard KPIs and activity feed',
    description:
      "Same payload as GET /dashboard. Defaults to platform-wide KPIs for admins/support (no user scoping) unless `user_id` narrows it to one user.",
  })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs and activity feed', type: Dashboard })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: "Scope the dashboard to a single user's data by their user id.",
  })
  getAdminDashboard(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(DashboardQuerySchema)) query: DashboardQueryType,
  ) {
    return this.dashboardService.getDashboard(authUser, query);
  }
}
