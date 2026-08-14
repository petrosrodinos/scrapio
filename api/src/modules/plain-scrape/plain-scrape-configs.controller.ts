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
  ApiParam,
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
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { PlainScrapeConfigsService } from './plain-scrape-configs.service';
import { CreatePlainScrapeConfigDto } from './dto/create-plain-scrape-config.dto';
import { UpdatePlainScrapeConfigDto } from './dto/update-plain-scrape-config.dto';
import {
  PlainScrapeConfigQuerySchema,
  PlainScrapeConfigQueryType,
} from './dto/plain-scrape-config-query.schema';
import { DeletePlainScrapeConfigsDto } from './dto/delete-plain-scrape-configs.dto';
import { PlainScrapeConfig } from './entities/plain-scrape-config.entity';

@ApiTags('Plain Scrape Configs')
@ApiBearerAuth()
@Controller('plain-scrape-configs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class PlainScrapeConfigsController {
  constructor(private readonly plainScrapeConfigsService: PlainScrapeConfigsService) {}

  @Get()
  @ApiOperation({ summary: 'List plain scrape configs (paginated, searchable)' })
  @ApiPaginatedResponse(PlainScrapeConfig, 'Paginated plain scrape config list')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)', example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Case-insensitive match against name' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by owning user id (admin/support only)' })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(PlainScrapeConfigQuerySchema))
    query: PlainScrapeConfigQueryType,
  ) {
    return this.plainScrapeConfigsService.findAll(authUser, query);
  }

  @Post('bulk-delete')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple plain scrape configs' })
  @ApiResponse({ status: 200, description: 'Configs deleted' })
  @ApiResponse({
    status: 400,
    description: 'One or more configs have an active run; cancel it before deleting',
  })
  @ApiResponse({ status: 404, description: 'One or more plain scrape configs not found' })
  removeMany(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: DeletePlainScrapeConfigsDto,
  ) {
    return this.plainScrapeConfigsService.removeMany(
      authUser,
      dto.workflow_config_ids,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one plain scrape config' })
  @ApiParam({ name: 'id', description: 'Plain scrape config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: PlainScrapeConfig })
  @ApiResponse({ status: 404, description: 'Config not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a plain scrape config' })
  @ApiResponse({ status: 201, type: PlainScrapeConfig })
  @ApiResponse({
    status: 400,
    description:
      'output_schema is missing/invalid while output_formats includes STRUCTURED_JSON',
  })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreatePlainScrapeConfigDto,
  ) {
    return this.plainScrapeConfigsService.create(authUser, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a plain scrape config' })
  @ApiParam({ name: 'id', description: 'Plain scrape config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: PlainScrapeConfig })
  @ApiResponse({
    status: 400,
    description:
      'output_schema is missing/invalid while output_formats includes STRUCTURED_JSON',
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlainScrapeConfigDto,
  ) {
    return this.plainScrapeConfigsService.update(authUser, id, dto);
  }

  @Post(':id/run-now')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a plain scrape run' })
  @ApiParam({ name: 'id', description: 'Plain scrape config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Crawl run enqueued' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  runNow(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.runNow(authUser, id);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a plain scrape config' })
  @ApiParam({ name: 'id', description: 'Plain scrape config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({
    status: 400,
    description: 'Config has an active run; cancel it before deleting',
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.remove(authUser, id);
  }
}
