import { Injectable } from '@nestjs/common';
import { Page } from 'playwright';

export interface InspectListingCandidate {
  selector: string;
  count: number;
  childTags: string[];
  sampleHtml: string;
}

export interface InspectListingResult {
  url: string;
  title: string;
  candidates: InspectListingCandidate[];
}

export interface InspectedNode {
  tag: string;
  classes: string;
  id: string;
  attrs: Record<string, string>;
  text: string;
  cssPath: string;
}

export interface InspectCardResult {
  cardIndex: number;
  cardCount: number;
  outerHtml: string;
  nodes: InspectedNode[];
}

export interface InspectDetailTextBlock {
  path: string;
  length: number;
  sample: string;
}

export interface InspectDetailImage {
  src: string;
  alt: string;
  classes: string;
}

export interface InspectAttributeListCandidate {
  selector: string;
  itemCount: number;
  sampleHtml: string;
}

export interface InspectDetailResult {
  url: string;
  headings: string[];
  textBlocks: InspectDetailTextBlock[];
  images: InspectDetailImage[];
  attributeListCandidates: InspectAttributeListCandidate[];
}

export interface InspectPaginationControl {
  tag: string;
  text: string;
  classes: string;
  id: string;
  href: string;
  relNext: boolean;
}

export interface InspectPaginationResult {
  url: string;
  scrollHeight: number;
  viewportHeight: number;
  nextLikeControls: InspectPaginationControl[];
  hasPaginationContainer: boolean;
}

const MAX_LISTING_CANDIDATES = 20;
const MAX_CARD_NODES = 80;
const MAX_CARD_HTML_CHARS = 6000;
const MAX_NODE_TEXT_CHARS = 120;

@Injectable()
export class DomInspectionService {
  async inspectListing(
    page: Page,
    maxCandidates = MAX_LISTING_CANDIDATES,
  ): Promise<InspectListingResult> {
    return page.evaluate((maxCandidates) => {
      const groups = new Map<string, Element[]>();
      document.querySelectorAll('body *').forEach((el) => {
        const cls =
          typeof el.className === 'string'
            ? el.className.trim().split(/\s+/).filter(Boolean)[0]
            : '';
        if (!cls) return;
        const key = `${el.tagName.toLowerCase()}.${cls}`;
        const group = groups.get(key);
        if (group) {
          group.push(el);
        } else {
          groups.set(key, [el]);
        }
      });

      const candidates = [...groups.entries()]
        .filter(([, els]) => els.length >= 3 && els.length <= 80)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, maxCandidates)
        .map(([key, els]) => {
          const first = els[0];
          const cls = key.slice(key.indexOf('.') + 1);
          const childTags = [
            ...new Set([...first.children].map((c) => c.tagName.toLowerCase())),
          ];
          return {
            selector: `.${cls}`,
            count: els.length,
            childTags,
            sampleHtml: (first.outerHTML || '').slice(0, 500),
          };
        });

      return {
        url: location.href,
        title: document.title,
        candidates,
      };
    }, maxCandidates);
  }

  async inspectCard(
    page: Page,
    listingSelector: string,
    cardIndex = 0,
    maxNodes = MAX_CARD_NODES,
  ): Promise<InspectCardResult> {
    return page.evaluate(
      ({
        listingSelector,
        cardIndex,
        maxNodes,
        maxHtmlChars,
        maxTextChars,
      }) => {
        const cards = document.querySelectorAll(listingSelector);
        const card = cards[cardIndex];
        if (!card) {
          return {
            cardIndex,
            cardCount: cards.length,
            outerHtml: '',
            nodes: [],
          };
        }

        function cssPath(el: Element): string {
          if (el === card) return '';
          const parts: string[] = [];
          let node: Element | null = el;
          while (node && node !== card && node.parentElement) {
            let part = node.tagName.toLowerCase();
            const cls =
              typeof node.className === 'string'
                ? node.className.trim().split(/\s+/).filter(Boolean)[0]
                : '';
            if (cls) {
              part += `.${cls}`;
            } else {
              const parent = node.parentElement;
              const siblings = [...parent.children].filter(
                (c) => c.tagName === node!.tagName,
              );
              if (siblings.length > 1) {
                part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
              }
            }
            parts.unshift(part);
            node = node.parentElement;
          }
          return parts.join(' > ');
        }

        const seen = new Set<Element>();
        const nodes: {
          tag: string;
          classes: string;
          id: string;
          attrs: Record<string, string>;
          text: string;
          cssPath: string;
        }[] = [];

        function addNode(el: Element | null) {
          if (!el || seen.has(el) || nodes.length >= maxNodes) return;
          seen.add(el);
          const attrs: Record<string, string> = {};
          ['href', 'src', 'data-src', 'data-lazy-src', 'data-original'].forEach(
            (a) => {
              const v = el.getAttribute(a);
              if (v) attrs[a] = v;
            },
          );
          nodes.push({
            tag: el.tagName.toLowerCase(),
            classes:
              typeof el.className === 'string' ? el.className.trim() : '',
            id: el.id || '',
            attrs,
            text: (el.textContent || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, maxTextChars),
            cssPath: cssPath(el),
          });
        }

        card.querySelectorAll('a[href]').forEach((el) => addNode(el));
        card.querySelectorAll('img').forEach((el) => addNode(el));
        card
          .querySelectorAll('h1, h2, h3, h4, h5, h6')
          .forEach((el) => addNode(el));

        const amountLike =
          /(?:[$€£¥]|\bUSD\b|\bEUR\b)\s?\d[\d.,\s]*\d|\d[\d.,\s]*\d\s?(?:[$€£¥]|\bUSD\b|\bEUR\b)/i;
        const hintClass = /title|name|label|price|amount|value|link|heading/i;

        card.querySelectorAll('*').forEach((el) => {
          if (nodes.length >= maxNodes) return;
          const ownText = [...el.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent || '')
            .join(' ')
            .trim();
          const cls = typeof el.className === 'string' ? el.className : '';
          if ((ownText && amountLike.test(ownText)) || hintClass.test(cls)) {
            addNode(el);
          }
        });

        return {
          cardIndex,
          cardCount: cards.length,
          outerHtml: (card.outerHTML || '').slice(0, maxHtmlChars),
          nodes,
        };
      },
      {
        listingSelector,
        cardIndex,
        maxNodes,
        maxHtmlChars: MAX_CARD_HTML_CHARS,
        maxTextChars: MAX_NODE_TEXT_CHARS,
      },
    );
  }

  async inspectDetail(page: Page): Promise<InspectDetailResult> {
    return page.evaluate(() => {
      function isExcluded(el: Element | null): boolean {
        let node = el;
        while (node) {
          const tag = node.tagName ? node.tagName.toLowerCase() : '';
          const role = node.getAttribute ? node.getAttribute('role') : null;
          if (
            tag === 'header' ||
            tag === 'nav' ||
            tag === 'footer' ||
            role === 'navigation' ||
            role === 'banner' ||
            role === 'contentinfo'
          ) {
            return true;
          }
          node = node.parentElement;
        }
        return false;
      }

      function cssPathAbs(el: Element): string {
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && node !== document.body && node.parentElement) {
          let part = node.tagName.toLowerCase();
          if (node.id) {
            parts.unshift(`${part}#${node.id}`);
            break;
          }
          const cls =
            typeof node.className === 'string'
              ? node.className.trim().split(/\s+/).filter(Boolean)[0]
              : '';
          if (cls) part += `.${cls}`;
          parts.unshift(part);
          node = node.parentElement;
        }
        return parts.join(' > ');
      }

      const headings = [...document.querySelectorAll('h1, h2, h3')]
        .filter((el) => !isExcluded(el))
        .slice(0, 10)
        .map((el) =>
          (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 150),
        );

      const textBlocks = [
        ...document.querySelectorAll('p, div, section, article'),
      ]
        .filter((el) => !isExcluded(el) && el.children.length <= 3)
        .map((el) => ({
          el,
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((b) => b.text.length > 80)
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 8)
        .map((b) => ({
          path: cssPathAbs(b.el),
          length: b.text.length,
          sample: b.text.slice(0, 200),
        }));

      const images = [...document.querySelectorAll('img')]
        .filter((el) => !isExcluded(el))
        .slice(0, 15)
        .map((el) => ({
          src: el.getAttribute('src') || el.getAttribute('data-src') || '',
          alt: el.getAttribute('alt') || '',
          classes: typeof el.className === 'string' ? el.className.trim() : '',
        }));

      const attributeListCandidates = [
        ...document.querySelectorAll('dl, table, ul'),
      ]
        .filter(
          (el) =>
            !isExcluded(el) && el.querySelectorAll('li, tr, dt').length >= 2,
        )
        .slice(0, 8)
        .map((el) => {
          const cls =
            typeof el.className === 'string'
              ? el.className.trim().split(/\s+/).filter(Boolean)[0]
              : '';
          const selector = cls
            ? `${el.tagName.toLowerCase()}.${cls}`
            : el.id
              ? `#${el.id}`
              : el.tagName.toLowerCase();
          return {
            selector,
            itemCount: el.querySelectorAll('li, tr, dt').length,
            sampleHtml: (el.outerHTML || '').slice(0, 400),
          };
        });

      return {
        url: location.href,
        headings,
        textBlocks,
        images,
        attributeListCandidates,
      };
    });
  }

  async inspectPagination(page: Page): Promise<InspectPaginationResult> {
    return page.evaluate(() => {
      const nextTextPattern =
        /^(next|more|»|›|load more|show more|>>|siguiente|suivant|weiter)$/i;

      const nextLikeControls = [...document.querySelectorAll('a, button')]
        .filter((el) => {
          const text = (el.textContent || '').trim();
          const aria = el.getAttribute('aria-label') || '';
          const rel = el.getAttribute('rel') || '';
          return (
            nextTextPattern.test(text) || /next/i.test(aria) || rel === 'next'
          );
        })
        .slice(0, 10)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 60),
          classes: typeof el.className === 'string' ? el.className.trim() : '',
          id: el.id || '',
          href: el.getAttribute('href') || '',
          relNext: el.getAttribute('rel') === 'next',
        }));

      return {
        url: location.href,
        scrollHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
        nextLikeControls,
        hasPaginationContainer: !!document.querySelector(
          '[class*="pagination" i], nav[aria-label*="pagination" i]',
        ),
      };
    });
  }
}
