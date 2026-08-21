import { describe, it, expect } from 'vitest';
import { mergeSettings } from './settings.js';

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
  it('defaults every block to on when absent', () => {
    expect(mergeSettings({}).blocks).toEqual({
      featured: true,
      collections: true,
      heroPromo: true,
    });
  });

  it('turns off only the blocks explicitly set to false', () => {
    const out = mergeSettings({ blocks: { featured: false, collections: true } });
    expect(out.blocks).toEqual({ featured: false, collections: true, heroPromo: true });
  });

  // A settings object saved before a switch existed (or with junk in it) must
  // never blank a section — only an explicit `false` switches one off.
  it('ignores non-boolean values and unknown keys', () => {
    const out = mergeSettings({ blocks: { featured: 'nope', mystery: false } });
    expect(out.blocks).toEqual({ featured: true, collections: true, heroPromo: true });
  });
});
