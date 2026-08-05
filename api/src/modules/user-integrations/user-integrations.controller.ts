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
import { AuthRole, IntegrationType } from 'generated/prisma';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
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
@Controller('admin/user-integrations')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class UserIntegrationsController {
  constructor(
    private readonly userIntegrationsService: UserIntegrationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List user integrations' })
  @ApiResponse({ status: 200, description: 'Paginated user integration list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'integration_type', required: false, enum: IntegrationType })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  findAll(
    @CurrentUser() authUser: AuthUser,
    @Query(new ZodValidationPipe(UserIntegrationQuerySchema))
    query: UserIntegrationQueryType,
  ) {
    return this.userIntegrationsService.findAll(authUser, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user integration' })
  @ApiResponse({ status: 200, type: UserIntegration })
  findOne(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.userIntegrationsService.findOne(authUser, id);
  }

  @Post()
  @ApiOperation({ summary: 'Connect an integration with API key credentials' })
  @ApiResponse({ status: 201, type: UserIntegration })
  connect(
    @CurrentUser() authUser: AuthUser,
    @Body() dto: ConnectUserIntegrationDto,
  ) {
    return this.userIntegrationsService.connect(authUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user integration' })
  @ApiResponse({ status: 200, type: UserIntegration })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserIntegrationDto,
  ) {
    return this.userIntegrationsService.update(authUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disconnect a user integration' })
  @ApiResponse({ status: 200 })
  disconnect(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.userIntegrationsService.disconnect(authUser, id);
  }
}
