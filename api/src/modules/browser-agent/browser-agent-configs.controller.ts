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
import { BrowserAgentConfigsService } from './browser-agent-configs.service';
import { CreateBrowserAgentConfigDto } from './dto/create-browser-agent-config.dto';
import { UpdateBrowserAgentConfigDto } from './dto/update-browser-agent-config.dto';
import {
  BrowserAgentConfigQuerySchema,
  BrowserAgentConfigQueryType,
} from './dto/browser-agent-config-query.schema';
import { DeleteBrowserAgentConfigsDto } from './dto/delete-browser-agent-configs.dto';
import { BrowserAgentConfig } from './entities/browser-agent-config.entity';

@ApiTags('Browser Agent Configs')
@ApiBearerAuth()
@Controller('browser-agent-configs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class BrowserAgentConfigsController {
  constructor(
    private readonly browserAgentConfigsService: BrowserAgentConfigsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List browser agent configs (paginated, searchable)' })
  @ApiPaginatedResponse(BrowserAgentConfig, 'Paginated browser agent config list')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)', example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Case-insensitive match against name' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by owning user id (admin/support only)' })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(BrowserAgentConfigQuerySchema))
    query: BrowserAgentConfigQueryType,
  ) {
    return this.browserAgentConfigsService.findAll(authUser, query);
  }

  @Post('bulk-delete')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple browser agent configs' })
  @ApiResponse({ status: 200, description: 'Configs deleted' })
  @ApiResponse({
    status: 400,
    description: 'One or more configs have an active run; cancel it before deleting',
  })
  @ApiResponse({ status: 404, description: 'One or more browser agent configs not found' })
  removeMany(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: DeleteBrowserAgentConfigsDto,
  ) {
    return this.browserAgentConfigsService.removeMany(
      authUser,
      dto.workflow_config_ids,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one browser agent config' })
  @ApiParam({ name: 'id', description: 'Browser agent config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: BrowserAgentConfig })
  @ApiResponse({ status: 404, description: 'Config not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a browser agent config' })
  @ApiResponse({ status: 201, type: BrowserAgentConfig })
  @ApiResponse({
    status: 400,
    description:
      'output_formats is empty, or output_schema is missing/invalid while output_formats includes STRUCTURED_JSON',
  })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateBrowserAgentConfigDto,
  ) {
    return this.browserAgentConfigsService.create(authUser, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a browser agent config' })
  @ApiParam({ name: 'id', description: 'Browser agent config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: BrowserAgentConfig })
  @ApiResponse({
    status: 400,
    description:
      'output_formats is empty, or output_schema is missing/invalid while output_formats includes STRUCTURED_JSON',
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBrowserAgentConfigDto,
  ) {
    return this.browserAgentConfigsService.update(authUser, id, dto);
  }

  @Post(':id/run-now')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a browser agent run' })
  @ApiParam({ name: 'id', description: 'Browser agent config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Crawl run enqueued' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  runNow(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.runNow(authUser, id);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a browser agent config' })
  @ApiParam({ name: 'id', description: 'Browser agent config id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({
    status: 400,
    description: 'Config has an active run; cancel it before deleting',
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.remove(authUser, id);
  }
}
