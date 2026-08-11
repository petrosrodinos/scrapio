import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ExtractionSchemaVersioningService } from './extraction-schema-versioning.service';

@Module({
  imports: [PrismaModule],
  providers: [ExtractionSchemaVersioningService],
  exports: [ExtractionSchemaVersioningService],
})
export class ExtractionSchemasModule {}
