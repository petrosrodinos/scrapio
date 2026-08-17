import { chromium, Browser, Page } from 'playwright';
import { DomInspectionService } from './dom-inspection.service';
import { BASIC_LISTING_HTML, DETAIL_PAGE_HTML } from './listing-pages.fixtures';

jest.setTimeout(30000);

describe('DomInspectionService', () => {
  let browser: Browser;
  let page: Page;
  const service = new DomInspectionService();

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('inspectListing', () => {
    it('finds the repeating card container as a candidate', async () => {
      await page.setContent(BASIC_LISTING_HTML);
      const result = await service.inspectListing(page);
      const cardCandidate = result.candidates.find(
        (c) => c.selector === '.catalog-card',
      );
      expect(cardCandidate).toBeDefined();
      expect(cardCandidate?.count).toBe(3);
    });
  });

  describe('inspectCard', () => {
    it('surfaces distinct nodes with distinct cssPaths for two similarly-classed fields', async () => {
      await page.setContent(BASIC_LISTING_HTML);
      const result = await service.inspectCard(page, '.catalog-card', 0);

      expect(result.cardCount).toBe(3);
      const titleNode = result.nodes.find((n) =>
        n.classes.includes('card-title'),
      );
      const priceNode = result.nodes.find((n) =>
        n.classes.includes('card-price'),
      );

      expect(titleNode).toBeDefined();
      expect(priceNode).toBeDefined();
      expect(titleNode?.text).toBe('Widget Alpha');
      expect(priceNode?.text).toBe('$19.99');
      expect(titleNode?.cssPath).not.toBe(priceNode?.cssPath);
      expect(titleNode?.cssPath).toContain('card-title');
      expect(priceNode?.cssPath).toContain('card-price');
    });

    it('returns an empty result when the card index is out of range', async () => {
      await page.setContent(BASIC_LISTING_HTML);
      const result = await service.inspectCard(page, '.catalog-card', 99);
      expect(result.cardCount).toBe(3);
      expect(result.nodes).toEqual([]);
    });
  });

  describe('inspectDetail', () => {
    it('finds headings, a description block, and an attribute-list candidate', async () => {
      await page.setContent(DETAIL_PAGE_HTML);
      const result = await service.inspectDetail(page);

      expect(result.headings.some((h) => h.includes('Widget Alpha'))).toBe(
        true,
      );
      expect(
        result.textBlocks.some((b) => b.sample.includes('premium widget')),
      ).toBe(true);
      expect(result.attributeListCandidates.length).toBeGreaterThan(0);
      expect(result.images.length).toBeGreaterThan(0);
    });

    it('excludes header/footer/nav content from headings', async () => {
      await page.setContent(DETAIL_PAGE_HTML);
      const result = await service.inspectDetail(page);
      expect(result.headings.some((h) => h.includes('Home / Catalog'))).toBe(
        false,
      );
    });
  });

  describe('inspectPagination', () => {
    it('finds a next-like control', async () => {
      await page.setContent(BASIC_LISTING_HTML);
      const result = await service.inspectPagination(page);
      expect(result.nextLikeControls.some((c) => /next/i.test(c.text))).toBe(
        true,
      );
    });
  });
});
