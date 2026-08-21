import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import ProductCard from './ProductCard.jsx';

function renderCard(product) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <ProductCard
            product={product}
            categorySlug="tocadores"
            categoryName={{ es: 'Tocadores', en: 'Dressing tables' }}
          />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

const withPhoto = {
  id: 'Tocador-M-01',
  name: 'Tocador',
  price: 499,
  media: [{ type: 'image', src: '/uploads/a.jpg' }],
};

describe('ProductCard', () => {
  it('renders the cover photo', () => {
    const { container } = renderCard(withPhoto);
    expect(container.querySelector('img').getAttribute('src')).toBe('/uploads/a_800.webp');
  });

  // Regression: /admin's "+ Добавить товар" creates a product with an empty
  // gallery, so a product can be saved before its photos are uploaded. The card
  // used to read media[0].src unguarded and took the whole category grid down
  // with a TypeError.
  it('falls back to the placeholder for a product with no photos or video', () => {
    const photoless = { id: 'Tocador-M-02', name: 'Tocador', price: 0, media: [] };
    const { container } = renderCard(photoless);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('M')).toBeTruthy();
    // Still a working link to the product.
    expect(container.querySelector('a').getAttribute('href')).toBe('/tocadores/Tocador-M-02');
  });

  it('survives a product with no media field at all (legacy row)', () => {
    const legacy = { id: 'Tocador-M-03', name: 'Tocador', price: 0, images: [] };
    expect(() => renderCard(legacy)).not.toThrow();
    expect(screen.getByText('M')).toBeTruthy();
  });
});

describe('ProductCard — sale badge', () => {
  const sale = { ...withPhoto, price: 690, oldPrice: 790 };

  it('shows the badge and the struck-through old price for a sale product', () => {
    renderCard(sale);
    expect(screen.getByText('-13%')).toBeTruthy();
    expect(screen.getByText(/790/)).toBeTruthy();
  });

  it('hides the badge when the product switches it off, keeping the old price', () => {
    renderCard({ ...sale, showDiscountBadge: false });
    expect(screen.queryByText('-13%')).toBeNull();
    // The discount still reads in the price — that is the point of the switch.
    expect(screen.getByText(/790/)).toBeTruthy();
    expect(screen.getByText(/690/)).toBeTruthy();
  });
});
