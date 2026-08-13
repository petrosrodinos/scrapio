import { Injectable } from '@nestjs/common';
import { Locator } from 'playwright';
import { FieldDef } from '../interfaces/scraper-config.interface';
import { resolveRegexPattern } from '@/shared/constants/regex-presets.constants';

const FIELD_TIMEOUT = 2000;

@Injectable()
export class FieldExtractionService {
  normalizeFieldDef(def: string | FieldDef): FieldDef {
    if (typeof def === 'string') {
      return { selector: def, type: 'text' };
    }
    return {
      selector: def.selector,
      type: def.type ?? 'text',
      pattern: def.pattern,
      flags: def.flags,
    };
  }

  async extractField(
    element: Locator,
    def: string | FieldDef,
  ): Promise<string | string[] | null> {
    const { selector, type, pattern, flags } = this.normalizeFieldDef(def);

    try {
      const el = selector ? element.locator(selector).first() : element;

      if (type === 'href') {
        return (
          (await el.getAttribute('href', { timeout: FIELD_TIMEOUT })) ?? null
        );
      }
      if (type === 'src') {
        return (
          (await el.getAttribute('src', { timeout: FIELD_TIMEOUT })) ?? null
        );
      }
      if (type === 'background_image') {
        const style =
          (await el.getAttribute('style', { timeout: FIELD_TIMEOUT })) ?? '';
        const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
      }
      if (type === 'regex') {
        return this.extractRegexMatches(el, pattern, flags);
      }

      await el.waitFor({ state: 'attached', timeout: FIELD_TIMEOUT });
      return (
        (await el.evaluate((node) => {
          const isStruck =
            node instanceof HTMLElement &&
            (node.tagName === 'DEL' ||
              node.tagName === 'S' ||
              node.tagName === 'STRIKE' ||
              window
                .getComputedStyle(node)
                .textDecorationLine.includes('line-through'));
          if (isStruck && node.parentElement) {
            const parentText = node.parentElement.textContent
              ?.replace(/\s+/g, ' ')
              .trim();
            if (parentText) return parentText;
          }
          return node.textContent?.replace(/\s+/g, ' ').trim() || null;
        })) ?? null
      );
    } catch {
      return null;
    }
  }

  private async extractRegexMatches(
    el: Locator,
    pattern: string | undefined,
    flags: string | undefined,
  ): Promise<string[] | null> {
    if (!pattern) return null;

    let regex: RegExp;
    try {
      const source = resolveRegexPattern(pattern);
      const finalFlags = flags?.includes('g') ? flags : `${flags ?? ''}g`;
      regex = new RegExp(source, finalFlags);
    } catch {
      return null;
    }

    const html =
      (await el.innerHTML({ timeout: FIELD_TIMEOUT }).catch(() => '')) ?? '';
    const matches = [...html.matchAll(regex)].map((m) => (m[1] ?? m[0]).trim());
    const unique = [...new Set(matches)].filter(Boolean);
    return unique.length ? unique : null;
  }
}
