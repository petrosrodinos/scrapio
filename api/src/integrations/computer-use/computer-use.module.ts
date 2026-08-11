import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { GcsIntegrationModule } from '@/integrations/storage/gcs/gcs.module';
import { CredentialsModule } from '@/integrations/credentials/credentials.module';
import { ComputerUseClientService } from './services/computer-use-client.service';
import { ScraperConfigVerificationService } from './services/scraper-config-verification.service';
import { ScreenshotStorageService } from './services/screenshot-storage.service';
import { ComputerUseOrchestratorService } from './computer-use-orchestrator.service';
import { BrowserAgentOrchestratorService } from './browser-agent-orchestrator.service';

@Module({
  imports: [PrismaModule, GcsIntegrationModule, CredentialsModule],
  providers: [
    ComputerUseClientService,
    ScraperConfigVerificationService,
    ScreenshotStorageService,
    ComputerUseOrchestratorService,
    BrowserAgentOrchestratorService,
  ],
  exports: [
    ComputerUseOrchestratorService,
    BrowserAgentOrchestratorService,
    ComputerUseClientService,
    ScreenshotStorageService,
  ],
})
export class ComputerUseModule {}
