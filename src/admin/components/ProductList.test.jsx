import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { productGift } from '../../data/catalog.js';
import { productSiteLink } from '../siteLink.js';
import { applyUpdate } from '../update.js';
import ProductList from './ProductList.jsx';

// A product whose gallery deliberately starts with a video: the row must show
// the first PHOTO, matching the catalog cover rule.
const tocador = (extra = {}) => ({
  id: 'Tocador-M-05',
  name: 'Tocador Aria',
  reference: 'M-05',
  price: 489,
  oldPrice: 650,
  media: [
    { type: 'video', src: '/uploads/clip.mp4' },
    { type: 'image', src: '/uploads/cover.jpg' },
  ],
  ...extra,
});

// The gift product lives in another category and lends the offer its name and
// size — the rule stores only its id (see productGift in src/data/catalog.js).
const SHELF = { id: 'Estanteria-E-01', name: 'Estantería', subtitle: '60 × 180 cm', price: 89 };
const CATALOG_GIFT = { source: 'catalog', productId: SHELF.id };

function catalog({ categoryGift, products = [tocador()], shelf = SHELF } = {}) {
  return [
    { slug: 'tocadores', name: { es: 'Tocadores' }, gift: categoryGift, products },
    { slug: 'estanterias', name: { es: 'Estanterías' }, products: [shelf] },
  ];
}

function renderList({
  categories = catalog(),
  layout = 'full',
  reorderable = true,
  ...props
} = {}) {
  const handlers = {
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    onToggleSelected: vi.fn(),
    onToggleAll: vi.fn(),
  };
  const [category] = categories;
  render(
    <MemoryRouter>
      <ProductList
        rows={category.products.map((product) => ({ product, category }))}
        layout={layout}
        reorderable={reorderable}
        hrefFor={(id) => `?product=${id}`}
        // The same resolution the catalog section passes in.
        giftFor={(product, cat) => productGift(categories, product, cat, 'es')}
        siteLinkFor={(product, cat) => productSiteLink(categories, product, cat)}
        selected={new Set()}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  );
  return handlers;
}

// What the row hands up — `(id, change)` — resolved against the product, as
// the editor does.
const updatedWith = (onUpdate, product = tocador()) => {
  const [id, change] = onUpdate.mock.calls[0];
  expect(id).toBe(product.id);
  return applyUpdate(change, product);
};
const openMenu = (label = 'M-05') =>
  fireEvent.click(screen.getByRole('button', { name: `Действия с товаром ${label}` }));

describe('ProductList — the cover thumbnail', () => {
  it('shows the first photo, skipping a leading video', () => {
    renderList();
    const img = document.querySelector('li img');
    expect(img.getAttribute('src')).toContain('/uploads/cover');
    // A category can hold ~70 rows: the thumbnails wait until scrolled to.
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('falls back to a placeholder without a photo', () => {
    renderList({ categories: catalog({ products: [tocador({ media: [] })] }) });
    expect(document.querySelector('li img')).toBeNull();
  });
});

// The mark shows the resolved offer, by the same productGift() the shop uses:
// it appears on a product that knows nothing about gifts itself, and goes out
// where the offer has already left the site.
describe('ProductList — the gift mark', () => {
  const mark = () => screen.queryByRole('img', { name: /подарок/ });

  it('marks a product that inherits its category’s gift', () => {
    renderList({ categories: catalog({ categoryGift: CATALOG_GIFT }) });
    expect(mark().getAttribute('aria-label')).toBe('подарок: Estantería 60 × 180 cm');
  });

  it('names the product’s own gift, not the category’s', () => {
    const own = { mode: 'own', source: 'custom', name: { es: 'Bombillas LED' }, size: '' };
    renderList({
      categories: catalog({ categoryGift: CATALOG_GIFT, products: [tocador({ gift: own })] }),
    });
    expect(mark().getAttribute('aria-label')).toBe('подарок: Bombillas LED');
  });

  it('has none where nothing is given, the gift is off, or it ran out', () => {
    for (const categories of [
      catalog(),
      catalog({ categoryGift: CATALOG_GIFT, products: [tocador({ gift: { mode: 'off' } })] }),
      catalog({ categoryGift: CATALOG_GIFT, shelf: { ...SHELF, inStock: false } }),
    ]) {
      const view = render(
        <MemoryRouter>
          <ProductList
            rows={categories[0].products.map((product) => ({ product, category: categories[0] }))}
            layout="full"
            hrefFor={() => '?'}
            giftFor={(product, cat) => productGift(categories, product, cat, 'es')}
            siteLinkFor={(product, cat) => productSiteLink(categories, product, cat)}
            selected={new Set()}
          />
        </MemoryRouter>,
      );
      expect(within(view.container).queryByRole('img', { name: /подарок/ })).toBeNull();
      view.unmount();
    }
  });
});

describe('ProductList — editing in the row', () => {
  it('links the name to the product', () => {
    renderList();
    expect(screen.getByRole('link', { name: 'Tocador Aria' }).getAttribute('href')).toBe(
      '/?product=Tocador-M-05',
    );
  });

  it('changes the price in place', () => {
    const { onUpdate } = renderList();
    fireEvent.change(screen.getByLabelText('Цена M-05, €'), { target: { value: '459' } });
    expect(updatedWith(onUpdate).price).toBe(459);
  });

  it('shows the old price and the discount it makes', () => {
    renderList();
    expect(screen.getByText('650 €')).toBeTruthy();
    expect(screen.getByText('−25%')).toBeTruthy();
  });

  it('flips availability with its switch', () => {
    const { onUpdate } = renderList();
    fireEvent.click(screen.getByRole('switch'));
    expect(updatedWith(onUpdate).inStock).toBe(false);
  });

  it('marks a product hidden from listings', () => {
    renderList({ categories: catalog({ products: [tocador({ visibility: 'unlisted' })] }) });
    expect(screen.getByText('скрыт из списков')).toBeTruthy();
  });

  it('changes visibility from the row menu', () => {
    const { onUpdate } = renderList();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Снять с сайта/ }));
    expect(updatedWith(onUpdate).visibility).toBe('off');
  });
});

describe('ProductList — order', () => {
  const three = () =>
    catalog({
      products: [
        tocador({ id: 'A', reference: 'A' }),
        tocador({ id: 'B', reference: 'B' }),
        tocador({ id: 'C', reference: 'C' }),
      ],
    });

  it('moves a product by its menu, to a neighbour or an end', () => {
    const { onMove } = renderList({ categories: three() });
    openMenu('B');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Переместить выше' }));
    openMenu('B');
    fireEvent.click(screen.getByRole('menuitem', { name: 'В конец списка' }));
    expect(onMove.mock.calls).toEqual([
      ['B', 0],
      ['B', 2],
    ]);
  });

  it('cannot move the first product further up', () => {
    renderList({ categories: three() });
    openMenu('A');
    expect(screen.getByRole('menuitem', { name: 'Переместить выше' }).disabled).toBe(true);
  });

  it('drops a dragged product where it was let go', () => {
    const { onMove } = renderList({ categories: three() });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Перетащить C' }), { dataTransfer });
    // The row of A, the first one.
    const target = screen.getByRole('button', { name: 'Перетащить A' }).closest('li');
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('C', 0);
  });

  it('offers no order where the rows are not the order (search, filters, «Все»)', () => {
    renderList({ categories: three(), reorderable: false });
    expect(screen.queryByRole('button', { name: /Перетащить/ })).toBeNull();
    openMenu('B');
    expect(screen.queryByRole('menuitem', { name: 'Переместить выше' })).toBeNull();
  });
});

describe('ProductList — the page on the site', () => {
  it('links each desktop row to the product’s page, in a new tab', () => {
    renderList();
    const link = screen.getByRole('link', { name: 'Открыть на сайте: M-05' });
    expect(link.getAttribute('href')).toBe('/tocadores/Tocador-M-05');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('opens it from the row menu too', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderList({ layout: 'phone' });
    // No ↗ on a phone: the row itself is the tap target there.
    expect(screen.queryByRole('link', { name: /^Открыть на сайте/ })).toBeNull();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Открыть на сайте ↗' }));
    expect(open).toHaveBeenCalledWith('/tocadores/Tocador-M-05', '_blank', 'noopener');
    open.mockRestore();
  });

  it('says where a switched-off product’s address leads instead', () => {
    renderList({ categories: catalog({ products: [tocador({ visibility: 'off' })] }) });
    const link = screen.getByRole('link', { name: /^Адрес на сайте/ });
    expect(link.getAttribute('title')).toBe('Адрес на сайте (ведёт в «Tocadores»)');
  });
});

describe('ProductList — phone', () => {
  it('still shows which product the row is', () => {
    renderList({ layout: 'phone' });
    expect(screen.getByText('Tocador Aria')).toBeTruthy();
    expect(screen.getByText('M-05')).toBeTruthy();
  });

  it('flips availability from the menu, having no room for the switch', () => {
    const { onUpdate } = renderList({ layout: 'phone' });
    expect(screen.queryByRole('switch')).toBeNull();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Нет в наличии/ }));
    expect(updatedWith(onUpdate).inStock).toBe(false);
  });
});
