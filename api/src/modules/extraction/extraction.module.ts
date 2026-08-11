import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { ExtractionService } from './extraction.service';

@Module({
  imports: [PrismaModule, AiIntegrationModule],
  providers: [ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionModule {}
