import { CaptureConfig } from '../interfaces/capture-entry.interface';

/** Common analytics/tracking hosts that add noise without being part of a site's own API. */
export const DEFAULT_IGNORED_HOSTNAMES: string[] = [
  '*.google-analytics.com',
  '*.googletagmanager.com',
  '*.doubleclick.net',
  '*.google.com',
  '*.hotjar.com',
  'connect.facebook.net',
  '*.facebook.com',
  '*.facebook.net',
  '*.segment.io',
  '*.mixpanel.com',
  '*.sentry.io',
  '*.intercom.io',
  '*.clarity.ms',
  '*.newrelic.com',
  '*.bugsnag.com',
];

/**
 * Tighter than scripts/api-generator's defaults: only resource types that can carry API traffic
 * are captured, and response bodies are capped well below the standalone script's 5MB since
 * entries land in a Postgres jsonb column, not a flat file.
 */
export const DEFAULT_CAPTURE_CONFIG: CaptureConfig = {
  captureImages: false,
  captureFonts: false,
  captureStylesheets: false,
  captureScripts: false,
  captureXHR: true,
  captureFetch: true,
  captureWebSockets: true,
  maxBodySizeBytes: 256 * 1024,
  ignore: {
    hostnames: DEFAULT_IGNORED_HOSTNAMES,
    resourceTypes: [],
  },
};
