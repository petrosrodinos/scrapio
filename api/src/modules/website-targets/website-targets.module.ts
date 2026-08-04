import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { WebsiteTargetsController } from './website-targets.controller';
import { WebsiteTargetsService } from './website-targets.service';

@Module({
  imports: [PrismaModule],
  controllers: [WebsiteTargetsController],
  providers: [WebsiteTargetsService],
  exports: [WebsiteTargetsService],
})
export class WebsiteTargetsModule {}
