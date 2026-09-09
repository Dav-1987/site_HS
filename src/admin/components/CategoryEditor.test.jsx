import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryEditor from './CategoryEditor.jsx';

const noop = () => {};

// Товар-подарок лежит в другой категории и берёт оттуда своё имя и размеры —
// правило подарка хранит только его id (см. productGift в src/data/catalog.js).
const SHELF = {
  id: 'Estanteria-E-01',
  name: 'Estantería',
  subtitle: '60 × 180 cm',
  price: 89,
};

const GIFT_NAME = 'подарок: Estantería 60 × 180 cm';

// Правило на категории + один товар в ней: подарок ниоткуда не берётся, кроме
// как из этой пары, поэтому её и хватает для проверки.
function catalog({ categoryGift, product, shelf = SHELF } = {}) {
  return [
    {
      slug: 'tocadores',
      name: { es: 'Tocadores' },
      gift: categoryGift,
      products: [{ id: 'Tocador-L-01', name: 'Tocador', price: 479, ...product }],
    },
    { slug: 'estanterias', name: { es: 'Estanterías' }, products: [shelf] },
  ];
}

const CATALOG_GIFT = { source: 'catalog', productId: SHELF.id };

function renderCategory(categories) {
  return render(
    <CategoryEditor
      category={categories[0]}
      open
      onToggle={noop}
      onChange={noop}
      onRemove={noop}
      onMove={noop}
      onDuplicate={noop}
      isFirst
      isLast={false}
      allProducts={[]}
      allCategories={categories}
      categoryOptions={[]}
      onMoveProducts={noop}
    />,
  );
}

const giftMark = () => screen.queryByRole('img', { name: /подарок/ });

// Значок в строке товара показывает не поле, а разрешённое предложение: тем же
// productGift(), которым его считает витрина. Поэтому он появляется у товара,
// который сам про подарок ничего не знает, и гаснет там, где предложение с
// сайта уже пропало.
describe('CategoryEditor — знак подарка у товаров', () => {
  it('ставит значок товару, унаследовавшему подарок от категории', () => {
    renderCategory(catalog({ categoryGift: CATALOG_GIFT }));
    expect(screen.getByRole('img', { name: GIFT_NAME })).toBeTruthy();
  });

  it('называет в значке свой подарок товара, а не подарок категории', () => {
    renderCategory(
      catalog({
        categoryGift: CATALOG_GIFT,
        product: {
          gift: { mode: 'own', source: 'custom', name: { es: 'Bombillas LED' }, size: '' },
        },
      }),
    );
    expect(screen.getByRole('img', { name: 'подарок: Bombillas LED' })).toBeTruthy();
  });

  it('не ставит значок там, где категория ничего не дарит', () => {
    renderCategory(catalog());
    expect(giftMark()).toBeNull();
  });

  it('снимает значок с товара, которому подарок отключили', () => {
    renderCategory(catalog({ categoryGift: CATALOG_GIFT, product: { gift: { mode: 'off' } } }));
    expect(giftMark()).toBeNull();
  });

  it('снимает значок, когда сам подарок кончился', () => {
    renderCategory(catalog({ categoryGift: CATALOG_GIFT, shelf: { ...SHELF, inStock: false } }));
    expect(giftMark()).toBeNull();
  });
});
