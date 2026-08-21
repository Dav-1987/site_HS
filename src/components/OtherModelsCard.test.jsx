import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import OtherModelsCard from './OtherModelsCard.jsx';
import { OTHER_MODELS_SLUG } from '../data/catalog.js';

const section = (visibility) => ({
  slug: OTHER_MODELS_SLUG,
  name: { es: 'Otros Modelos', en: 'Other Models' },
  tagline: { es: '', en: '' },
  description: { es: '', en: '' },
  image: '',
  visibility,
  products: [{ id: 'p1', name: 'P1', material: { es: '', en: '' }, size: '' }],
});

function renderTile(catalog) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider initialCatalog={catalog}>
            <OtherModelsCard />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

// The tile is the section's only door anywhere on the site, so it is exactly
// what the section's visibility switch controls.
describe('OtherModelsCard', () => {
  it('links to the section while it is public', () => {
    const { container } = renderTile([section('public')]);
    expect(screen.getByText('Otros Modelos')).toBeTruthy();
    expect(container.querySelector('a').getAttribute('href')).toBe(`/${OTHER_MODELS_SLUG}`);
  });

  it('renders nothing when the section is hidden from listings', () => {
    const { container } = renderTile([section('unlisted')]);
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders nothing when the section is off the site', () => {
    const { container } = renderTile([section('off')]);
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders nothing when the section has been deleted', () => {
    const { container } = renderTile([]);
    expect(container.querySelector('a')).toBeNull();
  });
});
