import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductBadge from './ProductBadge.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';

const onSale = { id: 'Espejo-E-01', price: 690, oldPrice: 790 };

function renderBadge(product) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <ProductBadge product={product} />
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
