import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CategoryCard from './CategoryCard.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';

// A shelf worth having, a collection that gives it away, and one that does not.
const shelf = {
  id: 'Estanteria-E-03',
  name: 'Estantería | de pared',
  subtitle: '60 × 180 cm',
  price: 89,
  images: ['/uploads/shelf.jpg'],
};
const tocadores = {
  slug: 'tocadores',
  name: { es: 'Tocadores', en: 'Dressing tables' },
  image: '/uploads/t.jpg',
  gift: { source: 'catalog', productId: shelf.id },
  products: [{ id: 'Tocador-T-01', name: 'Tocador', price: 479 }],
};
const espejos = {
  slug: 'espejos',
  name: { es: 'Espejos', en: 'Mirrors' },
  image: '/uploads/e.jpg',
  products: [{ id: 'Espejo-F-05', name: 'Espejo', price: 199 }],
};
const estanterias = {
  slug: 'estanterias',
  name: { es: 'Estanterías', en: 'Shelves' },
  image: '/uploads/s.jpg',
  products: [shelf],
};
const catalog = [tocadores, espejos, estanterias];

function renderCard(category, cats = catalog) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider initialCatalog={cats}>
            <CategoryCard category={category} />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

// Matched loosely: the marker's wording is written in /admin (the shipped
// default puts a space after the plus), so pinning the exact string would make
// this fail the day the shop rephrases it. What is being tested is that the
// marker is there at all.
const MARKER = /\+\s*Regalo/;

describe('CategoryCard — the gift marker', () => {
  it('marks a collection that gives something away', () => {
    const { container } = renderCard(tocadores);
    expect(container.textContent).toMatch(MARKER);
  });

  it('says nothing on a collection that does not', () => {
    const { container } = renderCard(espejos);
    expect(container.textContent).not.toMatch(MARKER);
  });

  // Not a switch of its own and not a list of slugs: the marker follows from
  // the offers, through the same categoryHasGift() the navigation menu asks.
  // Setting a gift in /admin is what puts it on the tile, for whichever
  // collection that happens to be.
  it('follows the offer to whichever collection carries it', () => {
    const moved = { ...espejos, gift: { source: 'catalog', productId: shelf.id } };
    const { container } = renderCard(moved, [moved, tocadores, estanterias]);
    expect(container.textContent).toMatch(MARKER);
  });

  // Same rule the menu marker obeys: an offer that cannot be delivered is not
  // advertised, so a sold-out gift takes the marker with it.
  it('drops the marker when the gift is out of stock', () => {
    const soldOut = { ...estanterias, products: [{ ...shelf, inStock: false }] };
    const { container } = renderCard(tocadores, [tocadores, espejos, soldOut]);
    expect(container.textContent).not.toMatch(MARKER);
  });

  it('still renders the tile when there is no catalog to ask', () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsProvider>
          <LanguageProvider>
            <CategoryCard category={tocadores} />
          </LanguageProvider>
        </SettingsProvider>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain('Tocadores');
  });
});
