import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthRole, ScraperHealth, ScraperStatus } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ScrapersService } from './scrapers.service';
import { CreateScraperDto } from './dto/create-scraper.dto';
import { CreateScraperVersionDto } from './dto/create-scraper-version.dto';
import { UpdateScraperDto } from './dto/update-scraper.dto';
import {
  ScraperQuerySchema,
  ScraperQueryType,
} from './dto/scraper-query.schema';
import { DeleteScrapersDto } from './dto/delete-scrapers.dto';
import { Scraper } from './entities/scraper.entity';
import { ScraperVersion } from './entities/scraper-version.entity';
import { CrawlRun } from '../crawl-runs/entities/crawl-run.entity';

@ApiTags('Scrapers')
@ApiBearerAuth()
@Controller('admin/scrapers')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) {}

  @Get()
  @ApiOperation({
    summary: 'List scrapers (paginated, searchable, filterable)',
  })
  @ApiResponse({ status: 200, description: 'Paginated scraper list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ScraperStatus })
  @ApiQuery({ name: 'health', required: false, enum: ScraperHealth })
  @ApiQuery({ name: 'website_target_id', required: false, type: String })
  findAll(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(ScraperQuerySchema)) query: ScraperQueryType,
  ) {
    return this.scrapersService.findAll(userId, query);
  }

  @Post('bulk-delete')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple scrapers' })
  @ApiResponse({ status: 200, description: 'Scrapers deleted' })
  @ApiResponse({
    status: 400,
    description: 'One or more scrapers have an active crawl run',
  })
  @ApiResponse({ status: 404, description: 'One or more scrapers not found' })
  removeMany(
    @CurrentUser('id') userId: string,
    @Body() dto: DeleteScrapersDto,
  ) {
    return this.scrapersService.removeMany(userId, dto.scraper_ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one scraper with its active version' })
  @ApiResponse({ status: 200, type: Scraper })
  @ApiResponse({ status: 404, description: 'Scraper not found' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scrapersService.findOne(userId, id);
  }

  @Post()
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create a scraper with an initial active version (version 1)',
  })
  @ApiResponse({ status: 201, type: Scraper })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateScraperDto) {
    return this.scrapersService.create(userId, dto);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: "List a scraper's versions (newest first)" })
  @ApiResponse({ status: 200, type: [ScraperVersion] })
  listVersions(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scrapersService.listVersions(userId, id);
  }

  @Post(':id/versions')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new scraper version (does not activate it)',
  })
  @ApiResponse({ status: 201, type: ScraperVersion })
  createVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateScraperVersionDto,
  ) {
    return this.scrapersService.createVersion(userId, id, dto);
  }

  @Post(':id/versions/:versionId/activate')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary:
      'Activate a version (rollback or promote); un-breaks a BROKEN scraper',
  })
  @ApiResponse({ status: 200, type: Scraper })
  @ApiResponse({
    status: 404,
    description: 'Version not found for this scraper',
  })
  activateVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.scrapersService.activateVersion(userId, id, versionId);
  }

  @Patch(':id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary:
      'Toggle self_healing_enabled and/or update validation_rules (creates a new version)',
  })
  @ApiResponse({ status: 200, type: Scraper })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScraperDto,
  ) {
    return this.scrapersService.update(userId, id, dto);
  }

  @Post(':id/run-now')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a crawl run' })
  @ApiResponse({ status: 201, type: CrawlRun })
  @ApiResponse({ status: 404, description: 'Scraper not found' })
  runNow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scrapersService.runNow(userId, id);
  }

  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a scraper' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 400, description: 'Scraper has an active crawl run' })
  @ApiResponse({ status: 404, description: 'Scraper not found' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scrapersService.remove(userId, id);
  }
}
