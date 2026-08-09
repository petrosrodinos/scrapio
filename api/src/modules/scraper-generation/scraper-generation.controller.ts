import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import {
  AuthRole,
  GenerationRunStatus,
  GenerationTrigger,
} from 'generated/prisma';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ScraperGenerationService } from './scraper-generation.service';
import { CreateGenerationRunDto } from './dto/create-generation-run.dto';
import { RejectGenerationRunDto } from './dto/reject-generation-run.dto';
import { RetryGenerationRunDto } from './dto/retry-generation-run.dto';
import {
  GenerationRunQuerySchema,
  GenerationRunQueryType,
} from './dto/generation-run-query.schema';
import { ScraperGenerationRun } from './entities/generation-run.entity';

@ApiTags('Scraper Generation')
@ApiBearerAuth()
@Controller('admin/generation-runs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class ScraperGenerationController {
  constructor(
    private readonly scraperGenerationService: ScraperGenerationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List generation runs (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated generation run list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: GenerationRunStatus })
  @ApiQuery({ name: 'trigger', required: false, enum: GenerationTrigger })
  @ApiQuery({ name: 'website_target_id', required: false, type: String })
  @ApiQuery({ name: 'scraper_id', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(GenerationRunQuerySchema))
    query: GenerationRunQueryType,
  ) {
    return this.scraperGenerationService.findAll(authUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one generation run with its steps' })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({ status: 404, description: 'Generation run not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.scraperGenerationService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({
    summary:
      'Create a generation run. Pass start=true to queue immediately, or start=false to save as DRAFT.',
  })
  @ApiResponse({ status: 201, type: ScraperGenerationRun })
  @ApiResponse({
    status: 400,
    description: 'Invalid output config, or no Anthropic integration when starting',
  })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateGenerationRunDto,
  ) {
    return this.scraperGenerationService.create(authUser, dto);
  }

  @Post(':id/start')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Start a DRAFT generation run' })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({
    status: 400,
    description: 'Run is not DRAFT, or no Anthropic integration configured',
  })
  start(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.scraperGenerationService.start(authUser, id);
  }

  @Post(':id/approve')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Approve a staged config, promoting it into a new ScraperVersion',
  })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({
    status: 400,
    description: 'Run is not AWAITING_REVIEW with a staged config',
  })
  approve(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.scraperGenerationService.approve(authUser, id);
  }

  @Post(':id/reject')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Reject a generation run' })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({ status: 400, description: 'Run has already finished' })
  reject(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectGenerationRunDto,
  ) {
    return this.scraperGenerationService.reject(authUser, id, dto);
  }

  @Post(':id/cancel')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a QUEUED or RUNNING generation run' })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({
    status: 400,
    description: 'Only QUEUED or RUNNING runs can be cancelled',
  })
  cancel(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.scraperGenerationService.cancel(authUser, id);
  }

  @Post(':id/retry')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({
    summary:
      'Retry a failed or cancelled generation run from its last recorded step',
  })
  @ApiResponse({ status: 200, type: ScraperGenerationRun })
  @ApiResponse({
    status: 400,
    description: 'Run is not FAILED or CANCELLED, or self-healing is disabled',
  })
  retry(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: RetryGenerationRunDto,
  ) {
    return this.scraperGenerationService.retry(authUser, id, dto);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a generation run and its screenshot files from storage',
  })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({
    status: 400,
    description: 'Run is still QUEUED or RUNNING',
  })
  @ApiResponse({ status: 404, description: 'Generation run not found' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.scraperGenerationService.remove(authUser, id);
  }
}
