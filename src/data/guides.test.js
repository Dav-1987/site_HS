import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRODUCT_LIMIT,
  GUIDE_LIMITS,
  guideUploadKeys,
  missingForPublish,
  sanitizeGuide,
} from './guides.js';

const lang = (title) => ({
  title,
  description: `${title} — description`,
  answer: 'Short answer.',
  body: '## Heading\n\nText.',
  coverAlt: '',
  faq: [{ q: 'Question?', a: 'Answer.' }],
});

const complete = (overrides = {}) => ({
  slug: 'medidas-tocador',
  visibility: 'public',
  topic: 'tocadores',
  cover: '/uploads/abc123.webp',
  products: { category: 'tocadores', type: 'bulbs', minWidth: 60, maxWidth: 80, pinned: [] },
  es: lang('Medidas de un tocador'),
  en: lang('Dressing table sizes'),
  ...overrides,
});

const errorOf = (input) => sanitizeGuide(input).error;

describe('sanitizeGuide', () => {
  it('keeps a complete article as it is', () => {
    const { guide, error } = sanitizeGuide(complete());
    expect(error).toBeUndefined();
    expect(guide.slug).toBe('medidas-tocador');
    expect(guide.es.faq).toEqual([{ q: 'Question?', a: 'Answer.' }]);
    expect(guide.products).toEqual({
      category: 'tocadores',
      type: 'bulbs',
      minWidth: 60,
      maxWidth: 80,
      pinned: [],
      limit: DEFAULT_PRODUCT_LIMIT,
    });
  });

  // A whitelist: what it does not name never reaches the database.
  it('drops fields it does not know', () => {
    const { guide } = sanitizeGuide({
      ...complete(),
      extra: 'x',
      es: { ...lang('A'), html: '<b>' },
    });
    expect(guide).not.toHaveProperty('extra');
    expect(guide.es).not.toHaveProperty('html');
  });

  it('reads a missing visibility as a draft', () => {
    const { guide } = sanitizeGuide({ ...complete(), visibility: undefined });
    expect(guide.visibility).toBe('off');
  });

  it('lets a draft be saved half-written', () => {
    const { guide, error } = sanitizeGuide({
      slug: 'borrador',
      topic: 'espejos',
      es: { title: 'Solo un título', faq: [{ q: '¿Algo?' }] },
    });
    expect(error).toBeUndefined();
    expect(guide.en.title).toBe('');
    expect(guide.es.faq).toEqual([{ q: '¿Algo?', a: '' }]);
  });

  it('drops question pairs left empty in the editor', () => {
    const { guide } = sanitizeGuide(
      complete({
        es: {
          ...lang('A'),
          faq: [
            { q: ' ', a: '' },
            { q: 'Q?', a: 'A.' },
          ],
        },
      }),
    );
    expect(guide.es.faq).toEqual([{ q: 'Q?', a: 'A.' }]);
  });

  it.each([
    ['an uppercase slug', { slug: 'Medidas' }],
    ['a slug with spaces', { slug: 'medidas tocador' }],
    ['a slug with a trailing hyphen', { slug: 'medidas-' }],
    ['an unknown topic', { topic: 'cocinas' }],
    ['an unknown visibility', { visibility: 'unlisted' }],
  ])('refuses %s', (_, overrides) => {
    expect(errorOf(complete(overrides))).toBeTruthy();
  });

  it.each([
    ['a script URL', 'javascript:alert(1)'],
    ['a protocol-relative URL', '//evil.example/x.png'],
    ['a plain http URL', 'http://example.com/x.png'],
  ])('refuses %s as the cover', (_, cover) => {
    expect(errorOf(complete({ cover }))).toMatch(/cover/);
  });

  it('accepts a site path or an https URL as the cover', () => {
    expect(errorOf(complete({ cover: '/guias/cover.webp' }))).toBeUndefined();
    expect(errorOf(complete({ cover: 'https://images.example.com/x.webp' }))).toBeUndefined();
  });

  // Too long is refused, not cut: a truncated article would go out unnoticed.
  it('refuses a text over its limit instead of cutting it', () => {
    const body = 'x'.repeat(GUIDE_LIMITS.body + 1);
    expect(errorOf(complete({ es: { ...lang('A'), body } }))).toMatch(/es\.body/);
  });

  describe('the block of models', () => {
    const products = (rule) => sanitizeGuide(complete({ products: rule }));

    it('fills in an empty rule', () => {
      expect(products(undefined).guide.products).toEqual({
        category: '',
        type: '',
        minWidth: null,
        maxWidth: null,
        pinned: [],
        limit: DEFAULT_PRODUCT_LIMIT,
      });
    });

    it('allows no block at all', () => {
      expect(products({ limit: 0 }).guide.products.limit).toBe(0);
    });

    it('keeps each pinned model once', () => {
      expect(products({ pinned: ['Tocador-L-01', 'Tocador-L-01'] }).guide.products.pinned).toEqual([
        'Tocador-L-01',
      ]);
    });

    it.each([
      ['widths the wrong way round', { minWidth: 100, maxWidth: 60 }],
      ['a fractional width', { maxWidth: 80.5 }],
      ['a width of zero', { minWidth: 0 }],
      ['an unknown type', { type: 'neon' }],
      ['a category that is no slug', { category: 'Tocadores Loft' }],
      ['a pinned id with a slash', { pinned: ['../admin'] }],
      ['too many models', { limit: GUIDE_LIMITS.productLimit + 1 }],
    ])('refuses %s', (_, rule) => {
      expect(products(rule).error).toBeTruthy();
    });
  });

  describe('publishing', () => {
    it('needs the English version as well', () => {
      expect(errorOf(complete({ en: { title: 'Only a title' } }))).toMatch(/en\.description/);
    });

    it('needs both halves of every question', () => {
      expect(errorOf(complete({ es: { ...lang('A'), faq: [{ q: '¿Algo?', a: '' }] } }))).toMatch(
        /es\.faq\.1/,
      );
    });
  });
});

describe('missingForPublish', () => {
  it('is empty for a complete article', () => {
    expect(missingForPublish(complete())).toEqual([]);
  });

  it('names what each language lacks', () => {
    expect(missingForPublish({ es: lang('A'), en: { title: 'B' } })).toEqual([
      'en.description',
      'en.answer',
      'en.body',
    ]);
  });
});

describe('guideUploadKeys', () => {
  it('finds the cover and the photos in the text of both languages', () => {
    const guide = complete({
      es: { ...lang('A'), body: 'Foto: ![tocador](/uploads/es111.webp).' },
      en: { ...lang('B'), body: '![table](/uploads/en222.jpg "title")' },
    });
    expect(guideUploadKeys(guide)).toEqual(new Set(['abc123.webp', 'es111.webp', 'en222.jpg']));
  });

  it('ignores files that are not uploads', () => {
    expect(guideUploadKeys(complete({ cover: '/guias/cover.webp' }))).toEqual(new Set());
  });

  it('copes with nothing', () => {
    expect(guideUploadKeys(null)).toEqual(new Set());
  });
});
