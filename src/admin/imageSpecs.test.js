import { describe, it, expect } from 'vitest';
import { IMAGE_SPECS, imageSpecText } from './imageSpecs.js';

describe('imageSpecText', () => {
  it('называет соотношение и размер одной строкой', () => {
    expect(imageSpecText(IMAGE_SPECS.card)).toBe('Соотношение 4:5, рекомендуем 1600 × 2000 px.');
  });

  it('молчит, когда спецификации нет', () => {
    expect(imageSpecText(undefined)).toBe('');
    expect(imageSpecText({ ratio: '4:5' })).toBe('');
  });

  // Сервер нарезает загруженное на 400/800/1600 px по ширине, поэтому просить
  // больше 1600 не за чем — вариант всё равно не появится.
  it('не просит больше самого крупного варианта, который делает сервер', () => {
    for (const [name, spec] of Object.entries(IMAGE_SPECS)) {
      const width = Number(spec.size.split('×')[0].replace(/\s/g, ''));
      expect([name, width <= 2400]).toEqual([name, true]);
    }
  });
});
