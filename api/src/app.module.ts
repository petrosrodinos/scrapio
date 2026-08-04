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
    WebsiteTargetsModule,
    ScrapersModule,
    ScraperGenerationModule,
    CrawlRunsModule,
    JobsModule,
    DiagnosticsModule,
    PlatformConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
