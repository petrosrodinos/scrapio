import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { AuthRole, IntegrationType } from 'generated/prisma';
import { IntegrationsService } from './integrations.service';
import { Integration } from './entities/integration.entity';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.USER, AuthRole.ADMIN, AuthRole.SUPPORT)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List available integration connectors' })
  @ApiResponse({ status: 200, type: [Integration] })
  findAll() {
    return this.integrationsService.findAll(true);
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get one integration connector by type' })
  @ApiResponse({ status: 200, type: Integration })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  findOne(@Param('type') type: IntegrationType) {
    return this.integrationsService.findOne(type);
  }
}
