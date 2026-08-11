import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface FetchedPage {
  finalUrl: string;
  httpStatus: number | null;
  success: boolean;
  rawHtml: string | null;
  cleanedContent: string | null;
  title: string | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
}

const FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
const USER_AGENT =
  'Mozilla/5.0 (compatible; ScrapioBot/1.0; +https://scrapio.app/bot)';

@Injectable()
export class HtmlFetcherService {
  private readonly logger = new Logger(HtmlFetcherService.name);

  async fetch(url: string): Promise<FetchedPage> {
    try {
      const response = await axios.get<string>(url, {
        timeout: FETCH_TIMEOUT_MS,
        maxRedirects: MAX_REDIRECTS,
        validateStatus: () => true,
        responseType: 'text',
        transitional: { clarifyTimeoutError: true },
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const finalUrl: string =
        (response.request?.res?.responseUrl as string | undefined) ??
        response.config.url ??
        url;
      const httpStatus = response.status;
      const rawHtml =
        typeof response.data === 'string' ? response.data : String(response.data);
      const success = httpStatus >= 200 && httpStatus < 400;

      const $ = cheerio.load(rawHtml);
      const title = $('title').first().text().trim() || null;
      const metaDescription =
        $('meta[name="description"]').attr('content')?.trim() || null;
      const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || null;
      const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null;

      $('script, style, noscript, svg').remove();
      const cleanedContent =
        $('body').text().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() ||
        null;

      return {
        finalUrl,
        httpStatus,
        success,
        rawHtml,
        cleanedContent,
        title,
        metadata: {
          description: metaDescription,
          og_title: ogTitle,
          canonical_url: canonical,
        },
        errorMessage: success ? null : `Request failed with status ${httpStatus}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`fetch failed for ${url}: ${message}`);

      return {
        finalUrl: url,
        httpStatus: null,
        success: false,
        rawHtml: null,
        cleanedContent: null,
        title: null,
        metadata: null,
        errorMessage: message,
      };
    }
  }
}
