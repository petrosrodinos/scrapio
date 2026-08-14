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
@Controller('website-targets')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class WebsiteTargetsController {
  constructor(private readonly websiteTargetsService: WebsiteTargetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List website targets (paginated, searchable)',
  })
  @ApiPaginatedResponse(WebsiteTarget, 'Paginated website target list')
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page (max 100)', example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Case-insensitive match against name or base_url' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Filter by owning user id (admin/support only)' })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(WebsiteTargetQuerySchema))
    query: WebsiteTargetQueryType,
  ) {
    return this.websiteTargetsService.findAll(authUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one website target with block rules' })
  @ApiParam({ name: 'id', description: 'Website target id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: WebsiteTarget })
  @ApiResponse({ status: 404, description: 'Website target not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.websiteTargetsService.findOne(authUser, id);
  }

  @Post()
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Create a website target' })
  @ApiResponse({ status: 201, type: WebsiteTarget })
  @ApiResponse({ status: 409, description: 'A website target with this base_url already exists' })
  create(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateWebsiteTargetDto,
  ) {
    return this.websiteTargetsService.create(authUser, dto);
  }

  @Patch(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({ summary: 'Update a website target' })
  @ApiParam({ name: 'id', description: 'Website target id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, type: WebsiteTarget })
  @ApiResponse({ status: 404, description: 'Website target not found' })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWebsiteTargetDto,
  ) {
    return this.websiteTargetsService.update(authUser, id, dto);
  }

  @Delete(':id')
  @Roles(AuthRole.USER, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a website target (only if no scrapers/crawl runs exist)',
  })
  @ApiParam({ name: 'id', description: 'Website target id', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Website target not found' })
  @ApiResponse({
    status: 409,
    description: 'Website target has dependent scrapers or crawl runs',
  })
  remove(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.websiteTargetsService.remove(authUser, id);
  }
}
