import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { GcsService } from '@/integrations/storage/gcs/services/gcs.service';
import { GcsFolders } from '@/integrations/storage/gcs/config/gcs-folders.config';
import { DocumentType } from 'generated/prisma';

const SCREENSHOT_UPLOADER_PLACEHOLDER = 'scraper-generation';
const SCREENSHOT_URL_TTL_MINUTES = 60;

type StepWithScreenshotPaths = {
  screenshot_before?: { path: string } | null;
  screenshot_after?: { path: string } | null;
  screenshot_before_id?: string | null;
  screenshot_after_id?: string | null;
};

@Injectable()
export class ScreenshotStorageService {
  constructor(
    private readonly gcsService: GcsService,
    private readonly prisma: PrismaService,
  ) {}

  async store(buffer: Buffer, filename: string): Promise<string> {
    const contentType =
      filename.toLowerCase().endsWith('.jpg') ||
      filename.toLowerCase().endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

    const upload = await this.gcsService.uploadImageFromBuffer(
      buffer,
      filename,
      contentType,
      GcsFolders.generationRunScreenshots,
    );

    const document = await this.prisma.document.create({
      data: {
        user_id: SCREENSHOT_UPLOADER_PLACEHOLDER,
        filename: upload.filename,
        mimetype: contentType,
        size: upload.size,
        url: upload.url,
        path: upload.path,
        type: DocumentType.IMAGE,
      },
    });

    return document.id;
  }

  async attachSignedUrls<T extends StepWithScreenshotPaths>(
    steps: T[],
  ): Promise<
    Array<
      Omit<
        T,
        | 'screenshot_before'
        | 'screenshot_after'
        | 'screenshot_before_id'
        | 'screenshot_after_id'
      > & {
        screenshot_before_url: string | null;
        screenshot_after_url: string | null;
      }
    >
  > {
    return Promise.all(
      steps.map(
        async ({
          screenshot_before,
          screenshot_after,
          screenshot_before_id: _beforeId,
          screenshot_after_id: _afterId,
          ...step
        }) => {
          const [screenshot_before_url, screenshot_after_url] =
            await Promise.all([
              screenshot_before?.path
                ? this.gcsService.getSignedUrlForPath(
                    screenshot_before.path,
                    SCREENSHOT_URL_TTL_MINUTES,
                  )
                : null,
              screenshot_after?.path
                ? this.gcsService.getSignedUrlForPath(
                    screenshot_after.path,
                    SCREENSHOT_URL_TTL_MINUTES,
                  )
                : null,
            ]);

          return {
            ...step,
            screenshot_before_url,
            screenshot_after_url,
          };
        },
      ),
    );
  }
}
