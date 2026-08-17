import { Injectable } from '@nestjs/common';
import { BrowserContext, Page } from 'playwright';
import { FieldExtractionService } from '@/integrations/crawler/services/field-extraction.service';
import { ScraperConfig } from '@/integrations/crawler/interfaces/scraper-config.interface';
import { DEFAULT_SCROLL_PAUSE_MS } from '@/integrations/crawler/constants/crawler.constants';
import { VERIFY_TIMEOUT_MS } from '../constants/generation.constants';
import {
  findDisjointnessErrors,
  isBareDataUri,
} from '../utils/scraper-config-checks.util';

const DEFAULT_SAMPLE_CARDS = 5;

export interface ProbeReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  samples: Record<string, unknown>;
}

@Injectable()
export class ScraperConfigProbeService {
  constructor(private readonly fieldExtraction: FieldExtractionService) {}

  async probe(
    context: BrowserContext,
    page: Page,
    config: Partial<ScraperConfig>,
    sampleCards = DEFAULT_SAMPLE_CARDS,
  ): Promise<ProbeReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const samples: Record<string, unknown> = {};

    if (!config.listing_selector) {
      return {
        ok: false,
        errors: ['config.listing_selector is required to probe'],
        warnings,
        samples,
      };
    }

    let cardCount = 0;
    try {
      cardCount = await page.locator(config.listing_selector).count();
    } catch (e) {
      return {
        ok: false,
        errors: [
          `listing_selector "${config.listing_selector}" is invalid CSS: ${(e as Error).message.slice(0, 120)}`,
        ],
        warnings,
        samples,
      };
    }

    if (cardCount === 0) {
      return {
        ok: false,
        errors: [
          `listing_selector "${config.listing_selector}" matched 0 elements`,
        ],
        warnings,
        samples,
      };
    }

    samples.cardCount = cardCount;
    const sampled = Math.min(sampleCards, cardCount);
    samples.sampledCards = sampled;

    const cardSamples: Record<string, unknown>[] = [];

    for (let i = 0; i < sampled; i++) {
      const card = page.locator(config.listing_selector).nth(i);
      const fieldValues: Record<string, string | string[] | null> = {};
      const textFieldValues: Record<string, string | null> = {};

      for (const [fieldName, rawDef] of Object.entries(config.fields ?? {})) {
        const def = this.fieldExtraction.normalizeFieldDef(rawDef);
        const value = await this.fieldExtraction.extractField(card, def);
        fieldValues[fieldName] = value;

        const type = def.type ?? 'text';

        if (type === 'text') {
          textFieldValues[fieldName] = Array.isArray(value)
            ? value.join(' ')
            : value;
        }

        if (
          (type === 'src' || type === 'background_image') &&
          isBareDataUri(value)
        ) {
          errors.push(
            `card ${i}: field "${fieldName}" resolved to a bare data: URI — resolve the real lazy-load attribute (e.g. data-src) instead`,
          );
        }

        const isEmpty = Array.isArray(value)
          ? value.length === 0
          : !value || !String(value).trim();
        if (isEmpty && type !== 'regex') {
          errors.push(
            `card ${i}: field "${fieldName}" (selector "${def.selector ?? '(card root)'}", type ${type}) returned empty`,
          );
        }

        if (def.selector) {
          const matchCount = await card
            .locator(def.selector)
            .count()
            .catch(() => 0);
          if (matchCount > 1) {
            warnings.push(
              `card ${i}: field "${fieldName}" selector "${def.selector}" matches ${matchCount} nodes inside the card — only the first is used`,
            );
          }
        }
      }

      errors.push(...findDisjointnessErrors(textFieldValues, `card ${i}`));
      cardSamples.push(fieldValues);
    }

    samples.fields = cardSamples;

    if (config.detail_page && config.fields?.url) {
      const detailErrors = await this.probeDetailPage(context, page, config);
      errors.push(...detailErrors);
    }

    if (config.pagination) {
      const paginationErrors = await this.probePagination(page, config);
      errors.push(...paginationErrors);
    }

    return { ok: errors.length === 0, errors, warnings, samples };
  }

  private async probeDetailPage(
    context: BrowserContext,
    page: Page,
    config: Partial<ScraperConfig>,
  ): Promise<string[]> {
    const errors: string[] = [];
    const dp = config.detail_page;
    const urlDef = config.fields?.url;
    if (!dp || !urlDef || !config.listing_selector) return errors;

    const urlSel = typeof urlDef === 'string' ? urlDef : urlDef.selector;
    let detailUrl: string | null = null;
    try {
      detailUrl = await page
        .locator(config.listing_selector)
        .first()
        .locator(urlSel as string)
        .first()
        .getAttribute('href', { timeout: VERIFY_TIMEOUT_MS });
      if (detailUrl && !detailUrl.startsWith('http')) {
        detailUrl = new URL(detailUrl, page.url()).href;
      }
    } catch (e) {
      errors.push(
        `Cannot resolve detail URL to probe: ${(e as Error).message.slice(0, 80)}`,
      );
      return errors;
    }

    if (!detailUrl) return errors;

    const detailPage = await context.newPage();
    try {
      await detailPage.goto(detailUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await detailPage.waitForTimeout(1500);

      const textFieldValues: Record<string, string | null> = {};

      const checks: {
        key: 'description_selector' | 'specs_selector' | 'features_selector';
        label: string;
      }[] = [
        { key: 'description_selector', label: 'description_selector' },
        { key: 'specs_selector', label: 'specs_selector' },
        { key: 'features_selector', label: 'features_selector' },
      ];

      for (const { key, label } of checks) {
        const selector = dp[key];
        if (!selector) continue;
        try {
          const text = await detailPage
            .locator(selector)
            .first()
            .textContent({ timeout: VERIFY_TIMEOUT_MS });
          if (!text?.trim()) {
            errors.push(
              `detail_page.${label} "${selector}" matched but returned empty text`,
            );
          } else {
            textFieldValues[label] = text;
          }
        } catch (e) {
          errors.push(
            `detail_page.${label} "${selector}" not found on detail page — ${(e as Error).message.slice(0, 80)}`,
          );
        }
      }

      errors.push(...findDisjointnessErrors(textFieldValues, 'detail page'));

      if (dp.image_selector) {
        try {
          const imgEl = detailPage.locator(dp.image_selector).first();
          const imgVal =
            (dp.image_type ?? 'src') === 'background_image'
              ? ((
                  (await imgEl.getAttribute('style', {
                    timeout: VERIFY_TIMEOUT_MS,
                  })) ?? ''
                ).match(/background-image:\s*url\(['"]?(.*?)['"]?\)/)?.[1] ??
                null)
              : await imgEl.getAttribute('src', { timeout: VERIFY_TIMEOUT_MS });
          if (!imgVal) {
            errors.push(
              `detail_page.image_selector "${dp.image_selector}" returned no image value`,
            );
          } else if (isBareDataUri(imgVal)) {
            errors.push(
              `detail_page.image_selector "${dp.image_selector}" resolved to a bare data: URI`,
            );
          }
        } catch (e) {
          errors.push(
            `detail_page.image_selector "${dp.image_selector}" not found — ${(e as Error).message.slice(0, 80)}`,
          );
        }
      }
    } finally {
      await detailPage.close();
    }

    return errors;
  }

  private async probePagination(
    page: Page,
    config: Partial<ScraperConfig>,
  ): Promise<string[]> {
    const errors: string[] = [];
    const pagination = config.pagination;
    if (!pagination || !config.listing_selector) return errors;
    const type = (pagination.type ?? '').toString().toLowerCase();

    if (type === 'next_button') {
      const sel = pagination.selector;
      if (!sel) {
        errors.push(
          'pagination.type is "next_button" but pagination.selector is missing',
        );
        return errors;
      }
      try {
        const beforeHref = await page
          .locator(config.listing_selector)
          .first()
          .locator('a')
          .first()
          .getAttribute('href')
          .catch(() => null);

        const control = page.locator(sel).first();
        if (!(await control.count().catch(() => 0))) {
          errors.push(`pagination.selector "${sel}" matched 0 elements`);
          return errors;
        }

        await control.click({ timeout: 8000 });
        await page
          .waitForLoadState('domcontentloaded', { timeout: 20000 })
          .catch(() => undefined);
        await page.waitForTimeout(1500);

        const afterHref = await page
          .locator(config.listing_selector)
          .first()
          .locator('a')
          .first()
          .getAttribute('href')
          .catch(() => null);

        if (afterHref && afterHref === beforeHref) {
          errors.push(
            `pagination.selector "${sel}" was clicked but listings did not change`,
          );
          return errors;
        }

        const stillMatches = await page
          .locator(sel)
          .first()
          .count()
          .catch(() => 0);
        if (!stillMatches) {
          errors.push(
            `pagination.selector "${sel}" advanced once but no longer matches — it must be a persistent "next" control, not a page-number link`,
          );
        }
      } catch (e) {
        errors.push(
          `pagination.selector "${sel}" could not be clicked — ${(e as Error).message.slice(0, 120)}`,
        );
      }
      return errors;
    }

    if (type === 'infinite_scroll') {
      const before = await page.locator(config.listing_selector).count();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(DEFAULT_SCROLL_PAUSE_MS);
      const after = await page.locator(config.listing_selector).count();
      if (after <= before) {
        errors.push(
          `pagination.type "infinite_scroll" did not increase card count after scrolling (before: ${before}, after: ${after})`,
        );
      }
      return errors;
    }

    if (type === 'load_more') {
      const sel = pagination.selector;
      if (!sel) {
        errors.push(
          'pagination.type is "load_more" but pagination.selector is missing',
        );
        return errors;
      }
      const before = await page.locator(config.listing_selector).count();
      const btn = page.locator(sel).first();
      if (!(await btn.isVisible().catch(() => false))) {
        errors.push(
          `pagination.selector "${sel}" ("load_more") is not visible`,
        );
        return errors;
      }
      await btn.click({ timeout: 8000 }).catch((e) => {
        errors.push(
          `pagination.selector "${sel}" could not be clicked — ${(e as Error).message.slice(0, 120)}`,
        );
      });
      await page.waitForTimeout(DEFAULT_SCROLL_PAUSE_MS);
      const after = await page.locator(config.listing_selector).count();
      if (after <= before) {
        errors.push(
          `pagination.type "load_more" did not increase card count after clicking (before: ${before}, after: ${after})`,
        );
      }
      return errors;
    }

    return errors;
  }
}
