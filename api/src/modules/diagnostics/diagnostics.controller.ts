import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
  OmitType,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import {
  AuthRole,
  DiagnosticsArtifactKind,
  DiagnosticsMode,
  RunStatus,
} from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { DiagnosticsService } from './diagnostics.service';
import {
  DiagnosticsQuerySchema,
  DiagnosticsQueryType,
} from './dto/diagnostics-query.schema';

class DiagnosticsPackageWorkflowConfigSummary {
  @ApiProperty({ description: 'Scraper (workflow config) name', example: 'Yelp Restaurants' })
  name: string;
}

class DiagnosticsPackageWorkflowRunSummary {
  @ApiProperty({
    nullable: true,
    description: 'Website target id the crawl run targeted',
    example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  })
  website_target_id: string | null;

  @ApiProperty({
    enum: RunStatus,
    description: 'Status of the crawl run this diagnostics package belongs to',
    example: RunStatus.FAILED,
  })
  status: RunStatus;
}

class DiagnosticsArtifactSummary {
  @ApiProperty({
    enum: DiagnosticsArtifactKind,
    description: 'Kind of captured artifact',
    example: DiagnosticsArtifactKind.TRACE,
  })
  kind: DiagnosticsArtifactKind;
}

class DiagnosticsArtifactDetail extends DiagnosticsArtifactSummary {
  @ApiProperty({
    description: 'Artifact id',
    example: 'f1e2d3c4-b5a6-4f7e-8d9c-0b1a2c3d4e5f',
  })
  id: string;

  @ApiProperty({
    description: 'Id of the diagnostics package this artifact belongs to',
    example: 'e0d1c2b3-a4f5-4e6d-7c8b-9a0f1e2d3c4b',
  })
  diagnostics_package_id: string;

  @ApiProperty({
    description: 'Storage path of the artifact',
    example: 'diagnostics/e0d1c2b3-a4f5-4e6d-7c8b-9a0f1e2d3c4b/trace.zip',
  })
  path: string;

  @ApiProperty({ description: 'MIME type of the artifact', example: 'application/zip' })
  content_type: string;

  @ApiProperty({ description: 'Artifact size in bytes', example: 245_760 })
  size_bytes: number;

  @ApiProperty({
    description: 'When the artifact was created',
    example: '2026-08-14T09:32:31.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description:
      'Signed, time-limited URL to download the artifact (valid for 60 minutes)',
    example: 'https://storage.googleapis.com/scrapio-diagnostics/...&Expires=...',
  })
  url: string;
}

class DiagnosticsPackageListItem {
  @ApiProperty({
    description: 'Diagnostics package id',
    example: 'e0d1c2b3-a4f5-4e6d-7c8b-9a0f1e2d3c4b',
  })
  id: string;

  @ApiProperty({
    description: 'Crawl run (workflow run) id this package was captured for',
    example: 'd6a4f5e7-8c9b-4a0d-1e2f-3b4c5d6e7f8a',
  })
  workflow_run_id: string;

  @ApiProperty({
    description: 'Scraper (workflow config) id this package was captured for',
    example: 'c5f3e4d6-7b8a-4f9c-0e1d-2a3b4c5d6e7f',
  })
  workflow_config_id: string;

  @ApiProperty({
    enum: DiagnosticsMode,
    description: 'Capture mode used when this package was recorded',
    example: DiagnosticsMode.FULL_DEBUG,
  })
  mode: DiagnosticsMode;

  @ApiProperty({
    description: 'URL that was being crawled when the package was captured',
    example: 'https://www.google.com/maps/place/Example+Restaurant',
  })
  url: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Worker instance id that produced the package',
    example: 'worker-3',
  })
  worker_id: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Browser version used during capture',
    example: '124.0.6367.207',
  })
  browser_version: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Playwright version used during capture',
    example: '1.44.0',
  })
  playwright_version: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Scraper version that was active at capture time',
    example: 3,
  })
  scraper_version: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Retry attempt number, if this run was a retry',
    example: 1,
  })
  retry_number: number | null;

  @ApiProperty({
    description: 'When the crawl started',
    example: '2026-08-14T09:30:00.000Z',
  })
  started_at: Date;

  @ApiProperty({
    description: 'When the crawl finished',
    example: '2026-08-14T09:32:30.000Z',
  })
  finished_at: Date;

  @ApiProperty({ description: 'Duration of the crawl in milliseconds', example: 150_000 })
  duration_ms: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Short failure reason, if the crawl failed',
    example: 'SELECTOR_TIMEOUT',
  })
  failure_reason: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Raw exception message/stack, if one was thrown',
    example: 'TimeoutError: waiting for selector ".listing" failed: timeout 15000ms exceeded',
  })
  exception: string | null;

  @ApiProperty({
    description: 'When the diagnostics package was created',
    example: '2026-08-14T09:32:31.000Z',
  })
  created_at: Date;

  @ApiProperty({ type: DiagnosticsPackageWorkflowConfigSummary })
  workflow_config: DiagnosticsPackageWorkflowConfigSummary;

  @ApiProperty({ type: DiagnosticsPackageWorkflowRunSummary })
  workflow_run: DiagnosticsPackageWorkflowRunSummary;

  @ApiProperty({
    type: [DiagnosticsArtifactSummary],
    description: 'Artifact kinds captured for this package',
  })
  artifacts: DiagnosticsArtifactSummary[];
}

class DiagnosticsPackageDetail extends OmitType(DiagnosticsPackageListItem, [
  'artifacts',
] as const) {
  @ApiProperty({
    type: [DiagnosticsArtifactDetail],
    description: 'Captured artifacts with signed download URLs',
  })
  artifacts: DiagnosticsArtifactDetail[];
}

@ApiTags('Diagnostics')
@ApiBearerAuth()
@Controller('diagnostics')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get()
  @ApiOperation({
    summary: 'List diagnostics packages (paginated, filterable)',
  })
  @ApiPaginatedResponse(
    DiagnosticsPackageListItem,
    'Paginated diagnostics package list',
  )
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Records per page (capped at 100)',
  })
  @ApiQuery({
    name: 'scraper_id',
    required: false,
    type: String,
    description: 'Filter by scraper (workflow config) id',
  })
  @ApiQuery({
    name: 'crawl_run_id',
    required: false,
    type: String,
    description: 'Filter by crawl run (workflow run) id',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    type: String,
    description: 'Only packages created on/after this ISO 8601 datetime',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    type: String,
    description: 'Only packages created on/before this ISO 8601 datetime',
  })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(DiagnosticsQuerySchema))
    query: DiagnosticsQueryType,
  ) {
    return this.diagnosticsService.findAll(authUser, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one diagnostics package with signed artifact URLs',
  })
  @ApiParam({ name: 'id', description: 'Diagnostics package id', type: String })
  @ApiResponse({
    status: 200,
    description: 'Diagnostics package',
    type: DiagnosticsPackageDetail,
  })
  @ApiResponse({ status: 404, description: 'Diagnostics package not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.diagnosticsService.findOne(authUser, id);
  }
}
