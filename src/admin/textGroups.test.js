import { describe, expect, it } from 'vitest';
import { translations } from '../i18n/translations.js';
import { TEXT_GROUPS, groupTexts } from './textGroups.js';

describe('groupTexts', () => {
  it('gives every text on the site a group with a Russian name', () => {
    const groups = groupTexts(Object.keys(translations.es));
    const unnamed = groups.filter((g) => g.title === g.prefix).map((g) => g.prefix);
    expect(unnamed).toEqual([]);
  });

  it('names no group the site has no texts for', () => {
    const prefixes = new Set(Object.keys(translations.es).map((k) => k.split('.')[0]));
    expect(TEXT_GROUPS.map((g) => g.prefix).filter((p) => !prefixes.has(p))).toEqual([]);
  });

  it('lists groups in the order of TEXT_GROUPS, not of the keys', () => {
    const groups = groupTexts(['footer.a', 'nav.b', 'footer.c']);
    expect(groups).toEqual([
      { prefix: 'nav', title: 'Меню', keys: ['nav.b'] },
      { prefix: 'footer', title: 'Подвал', keys: ['footer.a', 'footer.c'] },
    ]);
  });

  it('keeps a text with an unknown prefix, after the named groups', () => {
    const groups = groupTexts(['brandNew.x', 'nav.a']);
    expect(groups.map((g) => g.prefix)).toEqual(['nav', 'brandNew']);
    expect(groups[1]).toEqual({ prefix: 'brandNew', title: 'brandNew', keys: ['brandNew.x'] });
  });

  it('returns nothing for no keys', () => {
    expect(groupTexts([])).toEqual([]);
  });
});
