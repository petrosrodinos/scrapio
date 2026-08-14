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
import { AuthRole, IntegrationType } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { ApiPaginatedResponse } from '@/shared/decorators/api-paginated-response.decorator';
import { UserIntegrationsService } from './user-integrations.service';
import { ConnectUserIntegrationDto } from './dto/connect-user-integration.dto';
import { UpdateUserIntegrationDto } from './dto/update-user-integration.dto';
import {
  UserIntegrationQuerySchema,
  UserIntegrationQueryType,
} from './dto/user-integration-query.schema';
import { UserIntegration } from './entities/user-integration.entity';

@ApiTags('User Integrations')
@ApiBearerAuth()
@Controller('user-integrations')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class UserIntegrationsController {
  constructor(
    private readonly userIntegrationsService: UserIntegrationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List user integrations (paginated, filterable). Non-privileged users only see their own integrations regardless of user_id.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page' })
  @ApiQuery({ name: 'integration_type', required: false, enum: IntegrationType, description: 'Filter by integration type' })
  @ApiQuery({ name: 'is_active', required: false, enum: ['true', 'false'], description: 'Filter by active status' })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filter by owning user ID (ADMIN, SUPER_ADMIN, SUPPORT only — ignored for other roles)',
  })
  @ApiPaginatedResponse(UserIntegration, 'Paginated user integration list')
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(UserIntegrationQuerySchema))
    query: UserIntegrationQueryType,
  ) {
    return this.userIntegrationsService.findAll(authUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user integration' })
  @ApiParam({ name: 'id', description: 'User integration ID' })
  @ApiResponse({ status: 200, type: UserIntegration })
  @ApiResponse({ status: 404, description: 'User integration not found' })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.userIntegrationsService.findOne(authUser, id);
  }

  @Post()
  @ApiOperation({ summary: 'Connect an integration with API key credentials' })
  @ApiResponse({ status: 201, type: UserIntegration })
  @ApiResponse({
    status: 400,
    description:
      'Integration is not available, computer_use_model/ai_model is missing, unsupported, or invalid for the integration type, or is_default was set on a non-AI integration',
  })
  @ApiResponse({ status: 409, description: 'Integration already connected for this user' })
  connect(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: ConnectUserIntegrationDto,
  ) {
    return this.userIntegrationsService.connect(authUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user integration' })
  @ApiParam({ name: 'id', description: 'User integration ID' })
  @ApiResponse({ status: 200, type: UserIntegration })
  @ApiResponse({
    status: 400,
    description:
      'computer_use_model/ai_model is missing, unsupported, or invalid for the integration type, or is_default was set without an ai_model or on a non-AI integration',
  })
  @ApiResponse({ status: 404, description: 'User integration not found' })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserIntegrationDto,
  ) {
    return this.userIntegrationsService.update(authUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disconnect a user integration' })
  @ApiParam({ name: 'id', description: 'User integration ID' })
  @ApiResponse({ status: 200, description: 'Disconnected' })
  @ApiResponse({ status: 404, description: 'User integration not found' })
  disconnect(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.userIntegrationsService.disconnect(authUser, id);
  }
}
