import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationType } from 'generated/prisma';
import {
  INTEGRATIONS,
  INTEGRATIONS_BY_TYPE,
  IntegrationDefinition,
} from '@/shared/config/integrations/integrations.config';

@Injectable()
export class IntegrationsService {
  findAll(visibleOnly = false): IntegrationDefinition[] {
    if (visibleOnly) {
      return INTEGRATIONS.filter((integration) => integration.is_visible);
    }

    return INTEGRATIONS;
  }

  findOne(type: IntegrationType): IntegrationDefinition {
    const integration = INTEGRATIONS_BY_TYPE[type];

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  isAvailable(type: IntegrationType, visibleOnly = false): boolean {
    const integration = INTEGRATIONS_BY_TYPE[type];

    if (!integration) {
      return false;
    }

    return visibleOnly ? integration.is_visible : true;
  }
}
