import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AiBatchJobStatus } from 'generated/prisma';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const BATCH_COMPLETION_WINDOW = '24h';
const BATCH_ENDPOINT = '/v1/chat/completions';

export interface BatchChatRequest {
  customId: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: object;
}

export interface SubmitBatchResult {
  externalBatchId: string;
  inputFileId: string;
  requestCount: number;
}

export interface RetrieveBatchResult {
  status: AiBatchJobStatus;
  outputFileId?: string | null;
  errorFileId?: string | null;
  rawStatus: string;
}

const OPENAI_BATCH_STATUS_MAP: Record<string, AiBatchJobStatus> = {
  validating: AiBatchJobStatus.IN_PROGRESS,
  in_progress: AiBatchJobStatus.IN_PROGRESS,
  finalizing: AiBatchJobStatus.IN_PROGRESS,
  completed: AiBatchJobStatus.COMPLETED,
  failed: AiBatchJobStatus.FAILED,
  expired: AiBatchJobStatus.EXPIRED,
  cancelling: AiBatchJobStatus.IN_PROGRESS,
  cancelled: AiBatchJobStatus.CANCELLED,
};

/**
 * Thin REST client for OpenAI's Batch API (https://platform.openai.com/docs/guides/batch).
 * Deliberately not routed through the Vercel `ai` SDK (which has no batch support) — talks to
 * OpenAI's HTTP API directly via axios, the same direct-HTTP style already used for webhook
 * delivery. Batching is OpenAI-only; there is no equivalent for the other providers.
 */
@Injectable()
export class AiBatchOpenAiService {
  private readonly logger = new Logger(AiBatchOpenAiService.name);

  async submitBatch(apiKey: string, requests: BatchChatRequest[]): Promise<SubmitBatchResult> {
    const lines = requests.map((request) =>
      JSON.stringify({
        custom_id: request.customId,
        method: 'POST',
        url: BATCH_ENDPOINT,
        body: {
          model: request.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'extraction',
              schema: request.jsonSchema,
              strict: true,
            },
          },
        },
      }),
    );

    const inputFileId = await this.uploadBatchFile(apiKey, lines.join('\n'));

    const { data } = await axios.post(
      `${OPENAI_API_BASE}/batches`,
      {
        input_file_id: inputFileId,
        endpoint: BATCH_ENDPOINT,
        completion_window: BATCH_COMPLETION_WINDOW,
      },
      { headers: this.authHeaders(apiKey) },
    );

    return {
      externalBatchId: data.id,
      inputFileId,
      requestCount: requests.length,
    };
  }

  async retrieveBatch(apiKey: string, externalBatchId: string): Promise<RetrieveBatchResult> {
    const { data } = await axios.get(`${OPENAI_API_BASE}/batches/${externalBatchId}`, {
      headers: this.authHeaders(apiKey),
    });

    const rawStatus = String(data.status);
    const status = OPENAI_BATCH_STATUS_MAP[rawStatus] ?? AiBatchJobStatus.IN_PROGRESS;

    return {
      status,
      outputFileId: data.output_file_id ?? null,
      errorFileId: data.error_file_id ?? null,
      rawStatus,
    };
  }

  async downloadFileContent(apiKey: string, fileId: string): Promise<string> {
    const { data } = await axios.get(`${OPENAI_API_BASE}/files/${fileId}/content`, {
      headers: this.authHeaders(apiKey),
      responseType: 'text',
      transformResponse: (res) => res,
    });

    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  private async uploadBatchFile(apiKey: string, jsonl: string): Promise<string> {
    const form = new FormData();
    form.append('purpose', 'batch');
    form.append('file', new Blob([jsonl], { type: 'application/jsonl' }), 'batch-input.jsonl');

    try {
      const { data } = await axios.post(`${OPENAI_API_BASE}/files`, form, {
        headers: this.authHeaders(apiKey),
      });
      return data.id;
    } catch (error) {
      this.logger.error(
        `Failed to upload OpenAI batch input file: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return { Authorization: `Bearer ${apiKey}` };
  }
}
