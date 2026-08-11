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
import { PlainScrapeConfigsService } from './plain-scrape-configs.service';
import { CreatePlainScrapeConfigDto } from './dto/create-plain-scrape-config.dto';
import { UpdatePlainScrapeConfigDto } from './dto/update-plain-scrape-config.dto';
import {
  PlainScrapeConfigQuerySchema,
  PlainScrapeConfigQueryType,
} from './dto/plain-scrape-config-query.schema';
import { DeletePlainScrapeConfigsDto } from './dto/delete-plain-scrape-configs.dto';

@ApiTags('Plain Scrape Configs')
@ApiBearerAuth()
@Controller('admin/plain-scrape-configs')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class PlainScrapeConfigsController {
  constructor(private readonly plainScrapeConfigsService: PlainScrapeConfigsService) {}

  @Get()
  @ApiOperation({ summary: 'List plain scrape configs (paginated, searchable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
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
  @ApiResponse({ status: 404, description: 'Config not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a plain scrape config' })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreatePlainScrapeConfigDto,
  ) {
    return this.plainScrapeConfigsService.create(authUser, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a plain scrape config' })
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
  runNow(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.runNow(authUser, id);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Delete a plain scrape config' })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.plainScrapeConfigsService.remove(authUser, id);
  }
}
