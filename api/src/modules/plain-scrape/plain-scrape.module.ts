import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { PLAIN_SCRAPE_QUEUE } from '@/core/queues/queues.constants';
import { CrawlRunsModule } from '@/modules/crawl-runs/crawl-runs.module';
import { ExtractionSchemasModule } from '@/modules/extraction-schemas/extraction-schemas.module';
import { ExtractionModule } from '@/modules/extraction/extraction.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PlainScrapeConfigsController } from './plain-scrape-configs.controller';
import { PlainScrapeConfigsService } from './plain-scrape-configs.service';
import { HtmlFetcherService } from './services/html-fetcher.service';
import { PlainScrapeProcessor } from '../../background/plain-scrape.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: PLAIN_SCRAPE_QUEUE }),
    CrawlRunsModule,
    ExtractionSchemasModule,
    ExtractionModule,
    NotificationsModule,
  ],
  controllers: [PlainScrapeConfigsController],
  providers: [PlainScrapeConfigsService, HtmlFetcherService, PlainScrapeProcessor],
  exports: [HtmlFetcherService],
})
export class PlainScrapeModule {}
