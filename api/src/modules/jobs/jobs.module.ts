import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import {
  BROWSER_AGENT_QUEUE,
  CRAWL_QUEUE,
  GENERATION_QUEUE,
  PLAIN_SCRAPE_QUEUE,
} from '@/core/queues/queues.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      { name: GENERATION_QUEUE },
      { name: CRAWL_QUEUE },
      { name: PLAIN_SCRAPE_QUEUE },
      { name: BROWSER_AGENT_QUEUE },
    ),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
