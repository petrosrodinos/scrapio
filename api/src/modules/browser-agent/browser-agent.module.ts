import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { BROWSER_AGENT_QUEUE } from '@/core/queues/queues.constants';
import { CrawlRunsModule } from '@/modules/crawl-runs/crawl-runs.module';
import { ExtractionSchemasModule } from '@/modules/extraction-schemas/extraction-schemas.module';
import { ExtractionModule } from '@/modules/extraction/extraction.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ComputerUseModule } from '@/integrations/computer-use/computer-use.module';
import { ApiCaptureModule } from '@/integrations/api-capture/api-capture.module';
import { BrowserAgentConfigsController } from './browser-agent-configs.controller';
import { BrowserAgentConfigsService } from './browser-agent-configs.service';
import { BrowserAgentProcessor } from '../../background/browser-agent.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: BROWSER_AGENT_QUEUE }),
    CrawlRunsModule,
    ExtractionSchemasModule,
    ExtractionModule,
    NotificationsModule,
    ComputerUseModule,
    ApiCaptureModule,
  ],
  controllers: [BrowserAgentConfigsController],
  providers: [BrowserAgentConfigsService, BrowserAgentProcessor],
})
export class BrowserAgentModule {}
