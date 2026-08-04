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
import { AuthRole } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { WebsiteTargetsService } from './website-targets.service';
import { CreateWebsiteTargetDto } from './dto/create-website-target.dto';
import { UpdateWebsiteTargetDto } from './dto/update-website-target.dto';
import {
  WebsiteTargetQuerySchema,
  WebsiteTargetQueryType,
} from './dto/website-target-query.schema';
import { WebsiteTarget } from './entities/website-target.entity';

@ApiTags('Website Targets')
@ApiBearerAuth()
@Controller('admin/website-targets')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPPORT)
export class WebsiteTargetsController {
  constructor(private readonly websiteTargetsService: WebsiteTargetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List website targets (paginated, searchable)',
  })
  @ApiResponse({ status: 200, description: 'Paginated website target list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(WebsiteTargetQuerySchema))
    query: WebsiteTargetQueryType,
  ) {
    return this.websiteTargetsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one website target with block rules' })
  @ApiResponse({ status: 200, type: WebsiteTarget })
  @ApiResponse({ status: 404, description: 'Website target not found' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websiteTargetsService.findOne(userId, id);
  }

  @Post()
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a website target' })
  @ApiResponse({ status: 201, type: WebsiteTarget })
  @ApiResponse({ status: 409, description: 'base_url already exists' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWebsiteTargetDto,
  ) {
    return this.websiteTargetsService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a website target' })
  @ApiResponse({ status: 200, type: WebsiteTarget })
  @ApiResponse({ status: 404, description: 'Website target not found' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebsiteTargetDto,
  ) {
    return this.websiteTargetsService.update(userId, id, dto);
  }

  @Delete(':id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a website target (only if no scrapers/crawl runs exist)',
  })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({
    status: 409,
    description: 'Website target has dependent scrapers or crawl runs',
  })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websiteTargetsService.remove(userId, id);
  }
}
