export type CaptureFormat =
  | 'json'
  | 'text'
  | 'html'
  | 'xml'
  | 'binary'
  | 'unknown';

export type RequestBodyEncoding =
  | 'json'
  | 'form-urlencoded'
  | 'multipart'
  | 'text'
  | 'none';

export interface RedirectHop {
  url: string;
  status: number;
}

export interface CapturedRequestBody {
  raw: string | null;
  parsed: unknown;
  encoding: RequestBodyEncoding;
}

export interface CapturedRequest {
  method: string;
  url: string;
  path: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: CapturedRequestBody;
  resourceType: string;
  initiator: string | null;
}

export interface CapturedResponse {
  status: number;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  mimeType: string;
  format: CaptureFormat;
  body: unknown;
  size: number;
  /** True when the body exceeded maxBodySizeBytes and was omitted to bound memory usage. */
  truncated: boolean;
}

export interface CaptureError {
  errorText: string;
}

export interface CaptureEntry {
  id: string;
  /** Preserves original request start order, independent of async finish order. */
  sequence: number;
  timestamp: string;
  duration: number;
  /** True when an earlier request with the same method + origin + path was already captured this run. */
  duplicate: boolean;
  redirectChain: RedirectHop[];
  request: CapturedRequest;
  response: CapturedResponse | null;
  failed: boolean;
  error: CaptureError | null;
}

export interface CaptureConfig {
  captureImages: boolean;
  captureFonts: boolean;
  captureStylesheets: boolean;
  captureScripts: boolean;
  captureXHR: boolean;
  captureFetch: boolean;
  captureWebSockets: boolean;
  /** Response bodies larger than this are recorded with metadata only (truncated: true). */
  maxBodySizeBytes: number;
  ignore: {
    hostnames: string[];
    resourceTypes: string[];
  };
}
