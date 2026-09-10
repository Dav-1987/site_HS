import { describe, it, expect } from 'vitest';
import { giftHint, langHint, listHint } from './hints.js';

describe('langHint', () => {
  it('называет заполненные языки', () => {
    expect(langHint({ es: 'Madera', en: 'Wood' })).toBe('ES · EN');
    expect(langHint({ es: 'Madera', en: '' })).toBe('ES');
  });

  it('ставит прочерк, когда не заполнено ничего', () => {
    expect(langHint({ es: '', en: '' })).toBe('—');
    expect(langHint(undefined)).toBe('—');
  });
});

describe('listHint', () => {
  it('склеивает непустое через точку', () => {
    expect(listHint('F-05', '80 × 180 cm')).toBe('F-05 · 80 × 180 cm');
    expect(listHint('', '80 × 180 cm')).toBe('80 × 180 cm');
  });

  it('ставит прочерк вместо пустой строки', () => {
    expect(listHint('', undefined, 0)).toBe('—');
  });
});

// Те же пять ответов, что и в выпадающем списке подарка.
describe('giftHint', () => {
  it('у товара различает наследование, свой подарок и отказ', () => {
    expect(giftHint(undefined, true)).toBe('как у категории');
    expect(giftHint({ mode: 'off' }, true)).toBe('без подарка');
    expect(giftHint({ mode: 'own', source: 'catalog', productId: 'x' }, true)).toBe(
      'товар из каталога',
    );
    expect(giftHint({ mode: 'own', source: 'custom' }, true)).toBe('свой');
  });

  // Количество — то, ради чего в раздел «Подарок» полезут второй раз, поэтому
  // оно стоит в заголовке рядом с самим ответом.
  it('дописывает количество, когда дарят больше одной штуки', () => {
    expect(giftHint({ source: 'catalog', productId: 'x', qty: 2 }, false)).toBe(
      'товар из каталога × 2',
    );
    expect(giftHint({ mode: 'own', source: 'custom', qty: 12 }, true)).toBe('свой × 12');
  });

  it('молчит про количество там, где своего подарка нет', () => {
    expect(giftHint({ source: 'catalog', productId: 'x', qty: 1 }, false)).toBe(
      'товар из каталога',
    );
    expect(giftHint({ qty: 5 }, false)).toBe('нет');
    expect(giftHint({ mode: 'off', qty: 5 }, true)).toBe('без подарка');
  });

  it('у категории пустой подарок — это «нет»', () => {
    expect(giftHint({}, false)).toBe('нет');
    expect(giftHint({ source: 'catalog', productId: 'x' }, false)).toBe('товар из каталога');
  });
});
