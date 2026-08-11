import { Module, Global } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { BullModule } from '@nestjs/bullmq';
import {
  BROWSER_AGENT_QUEUE,
  BULL_BOARD_ADAPTER,
  CRAWL_QUEUE,
  GENERATION_QUEUE,
  PLAIN_SCRAPE_QUEUE,
} from './queues.constants';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: GENERATION_QUEUE },
      { name: CRAWL_QUEUE },
      { name: PLAIN_SCRAPE_QUEUE },
      { name: BROWSER_AGENT_QUEUE },
    ),
  ],
  providers: [
    {
      provide: BULL_BOARD_ADAPTER,
      inject: [
        getQueueToken(GENERATION_QUEUE),
        getQueueToken(CRAWL_QUEUE),
        getQueueToken(PLAIN_SCRAPE_QUEUE),
        getQueueToken(BROWSER_AGENT_QUEUE),
      ],
      useFactory: (
        generationQueue: Queue,
        crawlQueue: Queue,
        plainScrapeQueue: Queue,
        browserAgentQueue: Queue,
      ) => {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');

        createBullBoard({
          queues: [
            new BullMQAdapter(generationQueue),
            new BullMQAdapter(crawlQueue),
            new BullMQAdapter(plainScrapeQueue),
            new BullMQAdapter(browserAgentQueue),
          ],
          serverAdapter,
        });

        return serverAdapter;
      },
    },
  ],
  exports: [BULL_BOARD_ADAPTER],
})
export class BullBoardModule {}
