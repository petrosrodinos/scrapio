import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { CredentialsModule } from '@/integrations/credentials/credentials.module';
import { IntegrationsModule } from '@/modules/integrations/integrations.module';
import { UserIntegrationsController } from './user-integrations.controller';
import { UserIntegrationsService } from './user-integrations.service';

@Module({
  imports: [PrismaModule, CredentialsModule, IntegrationsModule],
  controllers: [UserIntegrationsController],
  providers: [UserIntegrationsService],
  exports: [UserIntegrationsService],
})
export class UserIntegrationsModule {}
