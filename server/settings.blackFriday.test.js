import { describe, expect, it } from 'vitest';
import { mergeSettings } from './settings.js';

describe('server Black Friday settings', () => {
  it('preserves both campaign images through the save normalization', () => {
    expect(mergeSettings({}).blackFridayHero).toEqual({
      image: '/uploads/178863f09e500b897ac832bf4bf8e289.jpg',
      imageMobile: '',
    });
    expect(
      mergeSettings({
        blackFridayHero: { image: ' /uploads/desktop.jpg ', imageMobile: ' /uploads/mobile.jpg ' },
      }).blackFridayHero,
    ).toEqual({ image: '/uploads/desktop.jpg', imageMobile: '/uploads/mobile.jpg' });
  });
});
