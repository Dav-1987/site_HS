const russianPlural = new Intl.PluralRules('ru');

/**
 * A count with the noun form Russian wants after it: `forms` is the one / few /
 * many triple, e.g. ['товар', 'товара', 'товаров'] → "1 товар", "3 товара",
 * "5 товаров", "21 товар".
 */
export function countLabel(count, [one, few, many]) {
  const form = { one, few, many }[russianPlural.select(count)] ?? many;
  return `${count} ${form}`;
}
