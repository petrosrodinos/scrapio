import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Prisma } from 'generated/prisma';

@Injectable()
export class ExtractionSchemaVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchema(
    userId: string,
    name: string,
    definition: Record<string, unknown>,
  ): Promise<string> {
    const schema = await this.prisma.extractionSchema.create({
      data: {
        user_id: userId,
        name,
        versions: {
          create: {
            version: 1,
            definition: definition as Prisma.InputJsonValue,
          },
        },
      },
      include: { versions: true },
    });

    const version = schema.versions[0];

    await this.prisma.extractionSchema.update({
      where: { id: schema.id },
      data: {
        active_version_id: version.id,
        version_count: 1,
      },
    });

    return version.id;
  }

  async addVersion(
    existingVersionId: string,
    definition: Record<string, unknown>,
  ): Promise<string> {
    const existingVersion =
      await this.prisma.extractionSchemaVersion.findUniqueOrThrow({
        where: { id: existingVersionId },
      });

    const latest = await this.prisma.extractionSchemaVersion.findFirst({
      where: { extraction_schema_id: existingVersion.extraction_schema_id },
      orderBy: { version: 'desc' },
    });

    const version = await this.prisma.extractionSchemaVersion.create({
      data: {
        extraction_schema_id: existingVersion.extraction_schema_id,
        version: (latest?.version ?? 0) + 1,
        definition: definition as Prisma.InputJsonValue,
      },
    });

    await this.prisma.extractionSchema.update({
      where: { id: existingVersion.extraction_schema_id },
      data: {
        active_version_id: version.id,
        version_count: { increment: 1 },
      },
    });

    return version.id;
  }

  /**
   * Ensures a WorkflowConfig has an extraction schema version matching `definition` when
   * STRUCTURED_JSON output is requested: creates a new schema, adds a version onto the
   * existing schema, or clears the link when structured output is no longer requested.
   */
  async syncForConfig(params: {
    userId: string;
    schemaName: string;
    wantsStructured: boolean;
    definition?: Record<string, unknown> | null;
    currentVersionId?: string | null;
  }): Promise<string | null> {
    const { userId, schemaName, wantsStructured, definition, currentVersionId } =
      params;

    if (!wantsStructured || !definition) {
      return null;
    }

    if (currentVersionId) {
      return this.addVersion(currentVersionId, definition);
    }

    return this.createSchema(userId, schemaName, definition);
  }
}
