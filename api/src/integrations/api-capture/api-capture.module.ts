import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { GcsIntegrationModule } from '@/integrations/storage/gcs/gcs.module';
import { OpenApiSpecBuilderService } from './services/openapi-spec-builder.service';
import { NetworkCaptureStorageService } from './services/network-capture-storage.service';

@Module({
  imports: [PrismaModule, GcsIntegrationModule],
  providers: [OpenApiSpecBuilderService, NetworkCaptureStorageService],
  exports: [OpenApiSpecBuilderService, NetworkCaptureStorageService],
})
export class ApiCaptureModule {}
