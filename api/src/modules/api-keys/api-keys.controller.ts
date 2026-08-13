import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AuthUser } from '@/shared/interfaces/auth-user.interface';
import { AuthRole } from 'generated/prisma';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeyCreatedEntity } from './entities/api-key-created.entity';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.SUPPORT)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List my API keys' })
  @ApiResponse({ status: 200, type: [ApiKeyEntity] })
  findAll(@CurrentUser() authUser: AuthUser) {
    return this.apiKeysService.findAll(authUser);
  }

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, type: ApiKeyCreatedEntity })
  create(@CurrentUser() authUser: AuthUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(authUser, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename or enable/disable an API key' })
  @ApiResponse({ status: 200, type: ApiKeyEntity })
  update(
    @CurrentUser() authUser: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(authUser, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200 })
  revoke(@CurrentUser() authUser: AuthUser, @Param('id') id: string) {
    return this.apiKeysService.revoke(authUser, id);
  }
}
