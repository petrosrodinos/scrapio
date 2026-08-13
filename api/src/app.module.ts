import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './core/databases/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule } from './shared/config/env/env.module';
import { QueuesModule } from './core/queues/queues.module';
import { BullBoardModule } from './core/queues/bull-board.module';
import { WebsiteTargetsModule } from './modules/website-targets/website-targets.module';
import { ScrapersModule } from './modules/scrapers/scrapers.module';
import { ScraperGenerationModule } from './modules/scraper-generation/scraper-generation.module';
import { CrawlRunsModule } from './modules/crawl-runs/crawl-runs.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { UserIntegrationsModule } from './modules/user-integrations/user-integrations.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { UsersModule } from './modules/users/users.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { ExtractionSchemasModule } from './modules/extraction-schemas/extraction-schemas.module';
import { PlainScrapeModule } from './modules/plain-scrape/plain-scrape.module';
import { BrowserAgentModule } from './modules/browser-agent/browser-agent.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    RedisModule,
    QueuesModule,
    BullBoardModule,
    AuthModule,
    HealthModule,
    NotificationsModule,
    DashboardModule,
    WebsiteTargetsModule,
    ScrapersModule,
    ScraperGenerationModule,
    CrawlRunsModule,
    ExtractionModule,
    ExtractionSchemasModule,
    PlainScrapeModule,
    BrowserAgentModule,
    JobsModule,
    DiagnosticsModule,
    PlatformConfigModule,
    IntegrationsModule,
    UserIntegrationsModule,
    ApiKeysModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
