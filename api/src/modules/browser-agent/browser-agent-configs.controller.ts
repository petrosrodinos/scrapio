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
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { BrowserAgentConfigsService } from './browser-agent-configs.service';
import { CreateBrowserAgentConfigDto } from './dto/create-browser-agent-config.dto';
import { UpdateBrowserAgentConfigDto } from './dto/update-browser-agent-config.dto';
import {
  BrowserAgentConfigQuerySchema,
  BrowserAgentConfigQueryType,
} from './dto/browser-agent-config-query.schema';
import { DeleteBrowserAgentConfigsDto } from './dto/delete-browser-agent-configs.dto';

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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
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
  @ApiResponse({ status: 404, description: 'Config not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a browser agent config' })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateBrowserAgentConfigDto,
  ) {
    return this.browserAgentConfigsService.create(authUser, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a browser agent config' })
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
  runNow(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.runNow(authUser, id);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a browser agent config' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.browserAgentConfigsService.remove(authUser, id);
  }
}
