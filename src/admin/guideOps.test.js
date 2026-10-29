import { describe, expect, it } from 'vitest';
import {
  draftOf,
  editableOf,
  guideName,
  guideSlugError,
  isGuideDirty,
  linkableProducts,
  moveGuide,
  newGuide,
} from './guideOps.js';

const stored = {
  id: 3,
  slug: 'medidas-tocador',
  visibility: 'public',
  topic: 'tocadores',
  cover: '/uploads/a.jpg',
  products: {
    category: 'tocadores',
    type: '',
    minWidth: null,
    maxWidth: null,
    pinned: [],
    limit: 4,
  },
  es: { title: 'Medidas', description: 'D', answer: 'A', body: 'B', coverAlt: '', faq: [] },
  en: { title: 'Sizes', description: 'D', answer: 'A', body: 'B', coverAlt: '', faq: [] },
  revision: 'r1',
  publishedAt: '2026-10-29T10:00:00.000Z',
  updatedAt: '2026-10-29T10:00:00.000Z',
};

describe('editableOf', () => {
  // An article stored before keywords existed is not "changed" by opening it.
  it('fills in what an older article lacks, so it compares as unchanged', () => {
    expect(editableOf(stored).es.keywords).toEqual([]);
    expect(isGuideDirty(draftOf(stored), stored)).toBe(false);
  });

  it('keeps only what the server stores', () => {
    expect(Object.keys(editableOf(stored))).toEqual([
      'slug',
      'visibility',
      'topic',
      'cover',
      'products',
      'es',
      'en',
    ]);
  });
});

describe('draftOf', () => {
  it('keys a stored article by its id, or by the key it already had', () => {
    expect(draftOf(stored).key).toBe('g3');
    expect(draftOf(stored, 'new-1')).toMatchObject({ key: 'new-1', id: 3, revision: 'r1' });
  });
});

describe('isGuideDirty', () => {
  it('sees a change anywhere in the article', () => {
    const draft = draftOf(stored);
    expect(isGuideDirty({ ...draft, es: { ...draft.es, answer: 'Otro' } }, stored)).toBe(true);
    expect(isGuideDirty({ ...draft, products: { ...draft.products, limit: 2 } }, stored)).toBe(
      true,
    );
  });

  it('counts an article never stored as changed', () => {
    expect(isGuideDirty(newGuide([], 1), null)).toBe(true);
  });
});

describe('newGuide', () => {
  it('starts as a draft at the first free address', () => {
    const first = newGuide([], 1);
    expect(first).toMatchObject({ key: 'new-1', id: null, slug: 'nueva-guia', visibility: 'off' });
    expect(newGuide([first, { ...first, slug: 'nueva-guia-2' }], 2).slug).toBe('nueva-guia-3');
  });
});

describe('guideSlugError', () => {
  const list = [{ key: 'g1', slug: 'medidas-tocador' }];

  it('accepts a free, well-formed address', () => {
    expect(guideSlugError(list, 'new-1', 'espejo-hollywood')).toBe('');
    expect(guideSlugError(list, 'g1', 'medidas-tocador')).toBe('');
  });

  it.each([
    ['', /пустым/],
    ['Medidas', /строчные/],
    ['medidas tocador', /строчные/],
    ['medidas-tocador', /другой статьи/],
  ])('refuses "%s"', (slug, why) => {
    expect(guideSlugError(list, 'new-1', slug)).toMatch(why);
  });
});

describe('moveGuide', () => {
  const list = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

  it('moves an article one place', () => {
    expect(moveGuide(list, 'b', -1).map((g) => g.key)).toEqual(['b', 'a', 'c']);
    expect(moveGuide(list, 'b', 1).map((g) => g.key)).toEqual(['a', 'c', 'b']);
  });

  it('goes nowhere past the ends', () => {
    expect(moveGuide(list, 'a', -1)).toBe(list);
    expect(moveGuide(list, 'c', 1)).toBe(list);
  });
});

describe('guideName', () => {
  it('names an article by its Spanish title, then whatever it has', () => {
    expect(guideName(draftOf(stored))).toBe('Medidas');
    expect(guideName(newGuide([], 1))).toBe('nueva-guia');
  });
});

describe('linkableProducts', () => {
  it('offers every model with a page, with its section, never one taken off the site', () => {
    const categories = [
      {
        slug: 'tocadores',
        products: [
          { id: 'T-1', name: 'Tocador | Hollywood' },
          { id: 'T-2', name: 'Tocador | Oculto', visibility: 'unlisted' },
          { id: 'T-3', name: 'Tocador | Retirado', visibility: 'off' },
        ],
      },
      { slug: 'viejos', visibility: 'off', products: [{ id: 'V-1', name: 'Viejo' }] },
    ];
    expect(linkableProducts(categories)).toEqual([
      { id: 'T-1', slug: 'tocadores', name: 'Tocador Hollywood' },
      { id: 'T-2', slug: 'tocadores', name: 'Tocador Oculto' },
    ]);
  });
});
