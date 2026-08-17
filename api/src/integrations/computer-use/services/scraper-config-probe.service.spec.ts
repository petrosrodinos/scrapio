import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { FieldExtractionService } from '@/integrations/crawler/services/field-extraction.service';
import { ScraperConfigProbeService } from './scraper-config-probe.service';
import {
  BASIC_LISTING_HTML,
  DATA_URI_IMAGE_HTML,
  INFINITE_SCROLL_HTML,
  STATIC_LISTING_NO_GROWTH_HTML,
  LOAD_MORE_HTML,
} from './listing-pages.fixtures';

jest.setTimeout(30000);

describe('ScraperConfigProbeService', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const service = new ScraperConfigProbeService(new FieldExtractionService());

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterEach(async () => {
    await context.close();
  });

  it('passes for a config with disjoint, non-empty fields', async () => {
    await page.setContent(BASIC_LISTING_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: {
          title: { selector: '.card-title', type: 'text' },
          price: { selector: '.card-price', type: 'text' },
          url: { selector: '.card-link', type: 'href' },
        },
      },
      3,
    );

    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.samples.cardCount).toBe(3);
  });

  it('fails when two fields resolve to the same value on a card', async () => {
    await page.setContent(BASIC_LISTING_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: {
          title: { selector: '.card-title', type: 'text' },
          name: { selector: '.card-title', type: 'text' },
        },
      },
      3,
    );

    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => /resolve to the same value/.test(e))).toBe(
      true,
    );
  });

  it('fails when an image field resolves to a bare data: URI', async () => {
    await page.setContent(DATA_URI_IMAGE_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: {
          thumb: { selector: '.card-thumb', type: 'src' },
        },
      },
      1,
    );

    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => /bare data: URI/.test(e))).toBe(true);
  });

  it('passes infinite_scroll when the card count grows after scrolling', async () => {
    await page.setContent(INFINITE_SCROLL_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: { title: { selector: '.card-title', type: 'text' } },
        pagination: { type: 'infinite_scroll' },
      },
      2,
    );

    expect(report.ok).toBe(true);
  });

  it('fails infinite_scroll when the card count does not grow', async () => {
    await page.setContent(STATIC_LISTING_NO_GROWTH_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: { title: { selector: '.card-title', type: 'text' } },
        pagination: { type: 'infinite_scroll' },
      },
      2,
    );

    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => /infinite_scroll/.test(e))).toBe(true);
  });

  it('passes load_more when the card count grows after clicking', async () => {
    await page.setContent(LOAD_MORE_HTML);
    const report = await service.probe(
      context,
      page,
      {
        listing_selector: '.catalog-card',
        fields: { title: { selector: '.card-title', type: 'text' } },
        pagination: { type: 'load_more', selector: '.load-more-btn' },
      },
      2,
    );

    expect(report.ok).toBe(true);
  });
});
