// Полоска «11.11 Shopping Days» под шапкой. Скидки идут с 11 по 15 ноября
// включительно, поэтому полоска уходит сама в полночь на 16-е по Мадриду —
// чтобы после акции на сайте не висело обещание, которого уже нет.
export const PROMO_BAR_END = Date.parse('2026-11-16T00:00:00+01:00');

export function isPromoBarActive(now = Date.now()) {
  return now < PROMO_BAR_END;
}
