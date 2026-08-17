import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { GcsService } from '@/integrations/storage/gcs/services/gcs.service';
import { GcsFolders } from '@/integrations/storage/gcs/config/gcs-folders.config';
import { DocumentType } from 'generated/prisma';

const OPENAPI_SPEC_UPLOADER_PLACEHOLDER = 'browser-agent-capture';
const OPENAPI_SPEC_URL_TTL_MINUTES = 60;

@Injectable()
export class NetworkCaptureStorageService {
  constructor(
    private readonly gcsService: GcsService,
    private readonly prisma: PrismaService,
  ) {}

  async storeSpec(
    spec: Record<string, unknown>,
    filename: string,
  ): Promise<string> {
    const buffer = Buffer.from(JSON.stringify(spec, null, 2), 'utf-8');

    const upload = await this.gcsService.uploadImageFromBuffer(
      buffer,
      filename,
      'application/json',
      GcsFolders.openApiSpecs,
    );

    const document = await this.prisma.document.create({
      data: {
        user_id: OPENAPI_SPEC_UPLOADER_PLACEHOLDER,
        filename: upload.filename,
        mimetype: 'application/json',
        size: upload.size,
        url: upload.url,
        path: upload.path,
        type: DocumentType.OPENAPI_SPEC,
      },
    });

    return document.id;
  }

  async getSignedUrl(path: string): Promise<string> {
    return this.gcsService.getSignedUrlForPath(
      path,
      OPENAPI_SPEC_URL_TTL_MINUTES,
    );
  }
}
