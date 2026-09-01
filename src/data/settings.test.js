import { describe, it, expect } from 'vitest';
import { BLOCKS, mergeSettings, posterFor } from './settings.js';

describe('mergeSettings — featuredCards', () => {
  it('keeps valid cards with trimmed fields, in order', () => {
    const out = mergeSettings({
      featuredCards: [
        { productId: ' p1 ', cover: ' /uploads/a.jpg ', video: ' /uploads/v.mp4 ' },
        { productId: 'p2', cover: '', video: '' },
      ],
    });
    expect(out.featuredCards).toEqual([
      { productId: 'p1', cover: '/uploads/a.jpg', video: '/uploads/v.mp4' },
      { productId: 'p2', cover: '', video: '' },
    ]);
  });

  it('drops cards without a productId and non-object entries', () => {
    const out = mergeSettings({
      featuredCards: [{ cover: 'x' }, null, 'nope', { productId: '   ' }, { productId: 'ok' }],
    });
    expect(out.featuredCards).toEqual([{ productId: 'ok', cover: '', video: '' }]);
  });

  it('caps the list at 12 cards', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ productId: `p${i}` }));
    expect(mergeSettings({ featuredCards: many }).featuredCards).toHaveLength(12);
  });

  it('defaults to an empty array when absent or not an array', () => {
    expect(mergeSettings({}).featuredCards).toEqual([]);
    expect(mergeSettings({ featuredCards: 'nope' }).featuredCards).toEqual([]);
  });
});

describe('mergeSettings — blocks', () => {
  // Проверяем поведение, а не конкретный набор ключей: список BLOCKS растёт,
  // и тест, перечисляющий их вручную, ломается при добавлении каждой секции.
  it('defaults every block to on when absent', () => {
    const blocks = mergeSettings({}).blocks;
    expect(Object.keys(blocks).sort()).toEqual([...BLOCKS].sort());
    expect(Object.values(blocks).every((v) => v === true)).toBe(true);
  });

  it('turns off only the blocks explicitly set to false', () => {
    const out = mergeSettings({ blocks: { featured: false, collections: true } });
    expect(out.blocks.featured).toBe(false);
    for (const key of BLOCKS.filter((k) => k !== 'featured')) {
      expect(out.blocks[key]).toBe(true);
    }
  });

  // A settings object saved before a switch existed (or with junk in it) must
  // never blank a section — only an explicit `false` switches one off.
  it('ignores non-boolean values and unknown keys', () => {
    const out = mergeSettings({ blocks: { featured: 'nope', mystery: false } });
    expect(Object.keys(out.blocks).sort()).toEqual([...BLOCKS].sort());
    expect(Object.values(out.blocks).every((v) => v === true)).toBe(true);
  });

  it('carries a switch for the reviews section and its home strip', () => {
    expect(BLOCKS).toContain('reviews');
    expect(BLOCKS).toContain('reviewsHome');
  });
});

describe('mergeSettings — reviews', () => {
  it('keeps image and video items in the order they were arranged', () => {
    const out = mergeSettings({
      reviews: [{ image: '/uploads/a.png' }, { video: '/uploads/b.mp4' }, { image: '/uploads/c.png' }],
    });
    expect(out.reviews).toEqual([
      { image: '/uploads/a.png' },
      { video: '/uploads/b.mp4' },
      { image: '/uploads/c.png' },
    ]);
  });

  it('drops rows carrying neither an image nor a video', () => {
    const out = mergeSettings({ reviews: [{}, { image: '   ' }, null, 'nope', { image: '/uploads/a.png' }] });
    expect(out.reviews).toEqual([{ image: '/uploads/a.png' }]);
  });

  // Загрузили один и тот же файл дважды — на стене он должен быть один раз.
  it('de-duplicates repeated uploads', () => {
    const out = mergeSettings({
      reviews: [{ image: '/uploads/a.png' }, { image: '/uploads/a.png' }],
    });
    expect(out.reviews).toHaveLength(1);
  });

  // Строка с обоими полями неоднозначна: побеждает видео, картинка в такой
  // паре — это его постер, а он выводится из пути и не хранится.
  it('resolves an ambiguous row in favour of the video', () => {
    const out = mergeSettings({ reviews: [{ image: '/uploads/a.png', video: '/uploads/b.mp4' }] });
    expect(out.reviews).toEqual([{ video: '/uploads/b.mp4' }]);
  });

  it('defaults to an empty wall', () => {
    expect(mergeSettings({}).reviews).toEqual([]);
    expect(mergeSettings({ reviews: 'nope' }).reviews).toEqual([]);
  });
});

describe('posterFor', () => {
  it('derives the poster path from the clip path', () => {
    expect(posterFor('/uploads/abc.mp4')).toBe('/uploads/abc_poster.jpg');
    expect(posterFor('/uploads/abc.mov')).toBe('/uploads/abc_poster.jpg');
  });

  it('returns nothing for anything that is not an upload', () => {
    expect(posterFor('https://example.com/a.mp4')).toBe('');
    expect(posterFor('')).toBe('');
    expect(posterFor(null)).toBe('');
  });
});
