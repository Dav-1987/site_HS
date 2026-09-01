import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { defaultSettings } from '../data/settings.js';
import { translations } from '../i18n/translations.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import Home from '../pages/Home.jsx';
import Catalog from '../pages/Catalog.jsx';
import Contact from '../pages/Contact.jsx';
import NotFound from '../pages/NotFound.jsx';

// Render a page inside the same provider stack as main.jsx. With no backend,
// the contexts stay on the bundled default catalog (see test/setup.js).
function renderPage(ui, route = '/', { settings, catalog } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider initialSettings={settings}>
        <LanguageProvider>
          <CatalogProvider initialCatalog={catalog}>{ui}</CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

// Minimal category shaped the way the providers expect it.
const makeCategory = (slug, name, visibility) => ({
  slug,
  name: { es: name, en: name },
  tagline: { es: '', en: '' },
  description: { es: '', en: '' },
  image: '',
  visibility,
  products: [
    {
      id: `${slug}-1`,
      name,
      price: 100,
      image: '/uploads/a.jpg',
      images: ['/uploads/a.jpg'],
      media: [{ type: 'image', src: '/uploads/a.jpg' }],
      material: { es: '', en: '' },
      size: '',
    },
  ],
});

describe('page smoke render', () => {
  it('Home renders the hero subtitle', () => {
    renderPage(<Home />);
    expect(screen.getByText(/Espejos, tocadores y estanterías de diseño propio/i)).toBeTruthy();
  });

  it('Catalog renders its title', () => {
    renderPage(<Catalog />);
    expect(screen.getByText(/Todas las colecciones/i)).toBeTruthy();
  });

  it('Contact renders the page heading and subtitle', () => {
    renderPage(<Contact />);
    expect(screen.getByText(/Contacto/i)).toBeTruthy();
    expect(screen.getByText(/Escríbenos y te responderemos/i)).toBeTruthy();
  });

  it('NotFound renders the 404 code', () => {
    renderPage(<NotFound />);
    expect(screen.getByText('404')).toBeTruthy();
  });
});

// Home sections that /admin can switch off wholesale (settings.blocks).
describe('home page blocks', () => {
  // Текст промо владелец правит в /admin, и правка приезжает в бандл через
  // `npm run data:pull` при сборке. Поэтому сверяемся не с прописанной руками
  // формулировкой (она ломает тест в день смены акции), а с тем, что реально
  // увидит страница при переданных ей настройках: переопределение из настроек,
  // иначе строка из переводов.
  const promoFor = (settings) =>
    settings?.texts?.es?.['hero.promo'] ??
    defaultSettings.texts?.es?.['hero.promo'] ??
    translations.es['hero.promo'];
  const promo = promoFor(null);
  // Тесты ниже передают свои настройки — без переопределений текста, поэтому
  // на странице оказывается строка из переводов.
  const promoPlain = translations.es['hero.promo'];
  const collections = /Explora por categoría/i;
  // The grid needs something to list — with no backend the providers start
  // empty, and an empty collections section doesn't render at all.
  const catalog = [makeCategory('c1', 'Colección uno')];

  it('renders the promo line and the collections grid by default', () => {
    renderPage(<Home />, '/', { catalog });
    expect(screen.getByText(promo)).toBeTruthy();
    expect(screen.getByText(collections)).toBeTruthy();
  });

  it('drops the promo line when its switch is off', () => {
    renderPage(<Home />, '/', { catalog, settings: { blocks: { heroPromo: false } } });
    expect(screen.queryByText(promoPlain)).toBeNull();
    expect(screen.getByText(collections)).toBeTruthy();
  });

  it('drops the collections grid when its switch is off', () => {
    renderPage(<Home />, '/', { catalog, settings: { blocks: { collections: false } } });
    expect(screen.queryByText(collections)).toBeNull();
    expect(screen.getByText(promoPlain)).toBeTruthy();
  });

  it('drops the collections grid when every section is hidden', () => {
    renderPage(<Home />, '/', { catalog: [makeCategory('c1', 'Oculta', 'unlisted')] });
    expect(screen.queryByText(collections)).toBeNull();
  });
});

// Category visibility, end to end through the providers (see src/data/catalog.js).
describe('catalog listing respects visibility', () => {
  it('lists only the public sections', () => {
    renderPage(<Catalog />, '/catalogo', {
      catalog: [
        makeCategory('c1', 'Visible uno'),
        makeCategory('c2', 'Oculto de listas', 'unlisted'),
        makeCategory('c3', 'Fuera del sitio', 'off'),
      ],
    });
    expect(screen.getByText('Visible uno')).toBeTruthy();
    expect(screen.queryByText('Oculto de listas')).toBeNull();
    expect(screen.queryByText('Fuera del sitio')).toBeNull();
  });
});
