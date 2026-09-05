import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductBadge from './ProductBadge.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';

const onSale = { id: 'Espejo-E-01', price: 690, oldPrice: 790 };

// A catalog whose mirrors come with a shelf, so the tile's opposite corner has
// a gift chip of its own to show.
const withShelfGift = (product) => [
  {
    slug: 'espejos',
    name: { es: 'Espejos', en: 'Mirrors' },
    gift: { source: 'catalog', productId: 'shelf' },
    products: [product],
  },
  {
    slug: 'estanterias',
    name: { es: 'Estanterías', en: 'Shelves' },
    products: [{ id: 'shelf', name: 'Estantería | de pared', price: 89 }],
  },
];

function renderBadge(product, catalog) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider initialCatalog={catalog ?? []}>
            <ProductBadge product={product} />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

// The corner holds two chips at most, and only ever shows one at a time. These
// read the DOM rather than the paint: which chips exist, and which classes
// decide when each of them is visible.
const chips = (container) => [...container.querySelectorAll(':scope > span > span')];
const bulbs = () => screen.queryByText('de regalo');

describe('ProductBadge — the discount alone', () => {
  it('shows the percent off', () => {
    renderBadge(onSale);
    expect(screen.getByText('-13%')).toBeTruthy();
  });

  it('keeps turning red on hover when there are no bulbs to swap in', () => {
    const { container } = renderBadge(onSale);
    expect(chips(container)).toHaveLength(1);
    expect(chips(container)[0].className).toContain('group-hover:bg-danger');
  });

  it('renders nothing for a product that is neither on sale nor giving bulbs', () => {
    const { container } = renderBadge({ id: 'Espejo-E-01', price: 690 });
    expect(container.innerHTML).toBe('');
  });
});

describe('ProductBadge — the bulbs chip', () => {
  it('appears for a product whose perk is the free bulbs', () => {
    renderBadge({ ...onSale, perks: 'bulbs' });
    expect(bulbs()).toBeTruthy();
  });

  it('stays away when the product advertises another perk', () => {
    renderBadge({ ...onSale, perks: 'quality' });
    expect(bulbs()).toBeNull();
  });

  it('obeys the per-product switch over the perk', () => {
    renderBadge({ ...onSale, perks: 'bulbs', showBulbsBadge: false });
    expect(bulbs()).toBeNull();
  });

  // Nothing to take turns with: the chip is simply there, with no cycle class
  // that would fade it out on a phone.
  it('sits still in the corner when the product has no discount badge', () => {
    const { container } = renderBadge({ id: 'Espejo-E-01', price: 690, perks: 'bulbs' });
    expect(chips(container)).toHaveLength(1);
    expect(chips(container)[0].className).not.toContain('badge-cycle');
    expect(chips(container)[0].className).not.toContain('opacity-0');
  });

  // Standing alone it is still the chip that yields on a narrow photo, so the
  // corner is marked and the chip stays findable from CSS.
  it('is marked to yield when it stands alone beside a gift chip', () => {
    const alone = { id: 'Espejo-E-01', price: 690, perks: 'bulbs' };
    const { container } = renderBadge(alone, withShelfGift(alone));
    expect(container.querySelector(':scope > span').className).toContain('badge-yields');
    expect(container.querySelector('.badge-bulbs')).toBeTruthy();
  });
});

// A second gift chip sits in the opposite corner of the same photo. The two fit
// side by side wherever the photo is wider than ~220px and only collide on a
// phone's two-column grid, so the corner is only *marked* here — which of the
// two layouts this is, only CSS can measure (see index.css).
describe('ProductBadge — a product that comes with a gift of its own', () => {
  const product = { ...onSale, perks: 'bulbs' };
  const corner = (container) => container.querySelector(':scope > span');
  const renderWithGift = () => renderBadge(product, withShelfGift(product));

  it('still renders both chips — there is room for them nearly everywhere', () => {
    const { container } = renderWithGift();
    expect(screen.getByText('de regalo')).toBeTruthy();
    expect(chips(container)).toHaveLength(2);
  });

  it('marks the corner to give the bulbs up where the photo is too narrow', () => {
    const { container } = renderWithGift();
    expect(corner(container).className).toContain('badge-yields');
    // The chip the rule drops has to be findable from CSS in both arrangements,
    // the swap and the bulbs standing alone.
    expect(container.querySelector('.badge-bulbs')).toBeTruthy();
  });

  it('leaves the corner unmarked for a product with no gift', () => {
    const { container } = renderBadge(product);
    expect(corner(container).className).not.toContain('badge-yields');
  });

  // Same catalog, a product the gift rule does not reach.
  it('leaves it unmarked for a product the gift rule does not cover', () => {
    const shelf = { id: 'shelf', price: 690, oldPrice: 790, perks: 'bulbs' };
    const { container } = renderBadge(shelf, withShelfGift(product));
    expect(screen.getByText('de regalo')).toBeTruthy();
    expect(corner(container).className).not.toContain('badge-yields');
  });
});

describe('ProductBadge — the swap', () => {
  const swapping = () => renderBadge({ ...onSale, perks: 'bulbs' });

  it('puts both chips in the corner, the discount visible first', () => {
    const { container } = swapping();
    const [discount, gift] = chips(container);
    expect(discount.textContent).toBe('-13%');
    expect(discount.className).toContain('group-hover:opacity-0');
    expect(gift.className).toContain('opacity-0');
    expect(gift.className).toContain('group-hover:opacity-100');
  });

  // Hover swaps them on a pointer device; where there is no hover, the cycle
  // classes do it on a timer (see index.css).
  it('marks both chips for the no-hover cycle', () => {
    const { container } = swapping();
    const [discount, gift] = chips(container);
    expect(discount.className).toContain('badge-cycle-out');
    expect(gift.className).toContain('badge-cycle-in');
  });

  // The discount used to spend the hover turning red. It no longer does — the
  // corner says something else instead.
  it('drops the red hover state, which the bulbs now replace', () => {
    const { container } = swapping();
    expect(chips(container)[0].className).not.toContain('group-hover:bg-danger');
  });
});

describe('ProductBadge — sold out', () => {
  it('wins over both the discount and the bulbs', () => {
    const { container } = renderBadge({ ...onSale, perks: 'bulbs', inStock: false });
    expect(screen.getByText('Agotado')).toBeTruthy();
    expect(screen.queryByText('-13%')).toBeNull();
    expect(bulbs()).toBeNull();
    expect(chips(container)).toHaveLength(1);
  });
});
