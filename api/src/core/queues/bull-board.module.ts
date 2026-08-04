import { Module, Global } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { BullModule } from '@nestjs/bullmq';
import {
  BULL_BOARD_ADAPTER,
  CRAWL_QUEUE,
  GENERATION_QUEUE,
} from './queues.constants';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: GENERATION_QUEUE },
      { name: CRAWL_QUEUE },
    ),
  ],
  providers: [
    {
      provide: BULL_BOARD_ADAPTER,
      inject: [getQueueToken(GENERATION_QUEUE), getQueueToken(CRAWL_QUEUE)],
      useFactory: (generationQueue: Queue, crawlQueue: Queue) => {
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');

        createBullBoard({
          queues: [
            new BullMQAdapter(generationQueue),
            new BullMQAdapter(crawlQueue),
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
