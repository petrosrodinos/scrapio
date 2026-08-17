import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { ScraperConfigVerificationService } from './scraper-config-verification.service';
import {
  BASIC_LISTING_HTML,
  MISSING_FIELD_ON_LATER_CARD_HTML,
  DATA_URI_IMAGE_HTML,
  INFINITE_SCROLL_HTML,
  STATIC_LISTING_NO_GROWTH_HTML,
  NEXT_BUTTON_HTML,
} from './listing-pages.fixtures';

jest.setTimeout(30000);

describe('ScraperConfigVerificationService', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const service = new ScraperConfigVerificationService();

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

  it('passes for a config with disjoint, non-empty fields on every card', async () => {
    await page.setContent(BASIC_LISTING_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: {
        title: { selector: '.card-title', type: 'text' },
        price: { selector: '.card-price', type: 'text' },
        url: { selector: '.card-link', type: 'href' },
      },
    });

    expect(errors).toEqual([]);
  });

  it('samples beyond the first card and catches a field missing on a later card', async () => {
    await page.setContent(MISSING_FIELD_ON_LATER_CARD_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: {
        title: { selector: '.card-title', type: 'text' },
        price: { selector: '.card-price', type: 'text' },
      },
    });

    expect(
      errors.some((e) => e.startsWith('card 2:') && e.includes('price')),
    ).toBe(true);
  });

  it('fails when two fields resolve to the same value', async () => {
    await page.setContent(BASIC_LISTING_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: {
        title: { selector: '.card-title', type: 'text' },
        name: { selector: '.card-title', type: 'text' },
      },
    });

    expect(errors.some((e) => /resolve to the same value/.test(e))).toBe(true);
  });

  it('fails when an image field resolves to a bare data: URI', async () => {
    await page.setContent(DATA_URI_IMAGE_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: {
        thumb: { selector: '.card-thumb', type: 'src' },
      },
    });

    expect(errors.some((e) => /bare data: URI/.test(e))).toBe(true);
  });

  it('passes infinite_scroll pagination when the card count grows', async () => {
    await page.setContent(INFINITE_SCROLL_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: { title: { selector: '.card-title', type: 'text' } },
      pagination: { type: 'infinite_scroll' },
    });

    expect(errors).toEqual([]);
  });

  it('fails infinite_scroll pagination when the card count does not grow', async () => {
    await page.setContent(STATIC_LISTING_NO_GROWTH_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: { title: { selector: '.card-title', type: 'text' } },
      pagination: { type: 'infinite_scroll' },
    });

    expect(errors.some((e) => /infinite_scroll/.test(e))).toBe(true);
  });

  it('passes next_button pagination that advances and remains a persistent control', async () => {
    await page.setContent(NEXT_BUTTON_HTML);
    const errors = await service.verify(context, page, {
      start_url: 'about:blank',
      listing_selector: '.catalog-card',
      fields: {
        title: { selector: '.card-title', type: 'text' },
        url: { selector: '.card-link', type: 'href' },
      },
      pagination: { type: 'next_button', selector: '.next-page-btn' },
    });

    expect(errors).toEqual([]);
  });
});
