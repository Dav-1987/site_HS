import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';

// The snapshot pull-guides.mjs writes, as a fixture: one article, both languages.
const fixture = vi.hoisted(() => {
  const lang = (prefix, extra) => ({
    title: `${prefix} title`,
    description: `${prefix} description`,
    coverAlt: `${prefix} cover`,
    ...extra,
  });
  const entry = {
    slug: 'medidas-tocador',
    topic: 'tocadores',
    cover: '/uploads/cover.jpg',
    publishedAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    es: lang('Medidas'),
    en: lang('Dimensions'),
  };
  const body = (prefix, href) => ({
    answer: `${prefix} answer`,
    html: `<h2 id="ancho">${prefix} ancho</h2><p>See <a href="${href}">the dressing tables</a>.</p><h2 id="fondo">${prefix} fondo</h2>`,
    toc: [
      { id: 'ancho', text: `${prefix} ancho` },
      { id: 'fondo', text: `${prefix} fondo` },
    ],
    faq: [{ q: `${prefix} question?`, a: `${prefix} reply.` }],
  });
  const article = {
    ...entry,
    products: { category: 'tocadores', limit: 4 },
    es: { ...entry.es, ...body('Medidas', '/tocadores') },
    en: { ...entry.en, ...body('Dimensions', '/en/tocadores') },
  };
  return { guides: [entry], article, promise: Promise.resolve(article) };
});

vi.mock('../guides/content.js', async (importOriginal) => ({
  ...(await importOriginal()),
  GUIDES: fixture.guides,
  findGuide: (slug) => fixture.guides.find((g) => g.slug === slug) ?? null,
  loadGuideArticle: (slug) => (slug === 'medidas-tocador' ? fixture.promise : null),
}));

const { default: Guide } = await import('../pages/Guide.jsx');
const { default: Guides } = await import('../pages/Guides.jsx');

const product = (id, size, visibility) => ({
  id,
  name: `Tocador | ${id}`,
  price: 499,
  size,
  visibility,
  image: '/uploads/p.jpg',
  images: ['/uploads/p.jpg'],
  media: [{ type: 'image', src: '/uploads/p.jpg' }],
});

const catalog = [
  {
    slug: 'tocadores',
    name: { es: 'Tocadores', en: 'Dressing Tables' },
    tagline: { es: '', en: '' },
    description: { es: '', en: '' },
    image: '',
    products: [
      product('Tocador-A', '120 × 40 × 160 cm'),
      product('Tocador-B', '100 × 40 × 160 cm'),
      product('Tocador-Off', '80 × 40 × 160 cm', 'off'),
    ],
  },
];

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

// Awaited: the article suspends on its own chunk (use()), and React only
// retries a suspended render inside an awaited act().
async function renderAt(path) {
  let result;
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={[path]}>
        <SettingsProvider>
          <LanguageProvider>
            <CatalogProvider initialCatalog={catalog}>
              <Suspense fallback={null}>
                <Routes>
                  {['/', '/en/'].map((prefix) => [
                    <Route key={`${prefix}guias`} path={`${prefix}guias`} element={<Guides />} />,
                    <Route
                      key={`${prefix}guia`}
                      path={`${prefix}guias/:slug`}
                      element={<Guide />}
                    />,
                  ])}
                  <Route path="*" element={null} />
                </Routes>
              </Suspense>
              <Where />
            </CatalogProvider>
          </LanguageProvider>
        </SettingsProvider>
      </MemoryRouter>,
    );
  });
  return result;
}

const jsonLd = (container) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]')).flatMap((s) =>
    [JSON.parse(s.textContent)].flat(),
  );

describe('a guide page', () => {
  beforeEach(() => {
    fixture.guides.splice(0, fixture.guides.length, { ...fixture.article, products: undefined });
  });

  it('opens with the title and the short answer, before anything else', async () => {
    await renderAt('/guias/medidas-tocador');
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Medidas title');
    const answer = screen.getByText('Medidas answer');
    // Search engines and AI assistants quote the start of a page.
    expect(h1.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Actualizado el/).textContent).toContain('29 de octubre de 2026');
  });

  it('shows the contents, the text and the questions it answers', async () => {
    const { container } = await renderAt('/guias/medidas-tocador');
    await screen.findByRole('heading', { level: 1 });
    const toc = screen.getByRole('navigation', { name: 'En este artículo' });
    expect(within(toc).getByRole('link', { name: 'Medidas ancho' }).getAttribute('href')).toBe(
      '#ancho',
    );
    expect(container.querySelector('h2#fondo')).toBeTruthy();
    expect(screen.getByText('Medidas question?')).toBeTruthy();
    expect(screen.getByText('Medidas reply.')).toBeTruthy();
  });

  it('marks itself up as an article with its questions and its place in the site', async () => {
    const { container } = await renderAt('/guias/medidas-tocador');
    await screen.findByRole('heading', { level: 1 });
    const types = jsonLd(container).map((node) => node['@type']);
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'Article', 'FAQPage']));
    const article = jsonLd(container).find((node) => node['@type'] === 'Article');
    expect(article.url).toBe('https://hsmuebles.es/guias/medidas-tocador');
    expect(article.dateModified).toBe('2026-10-29T10:00:00.000Z');
  });

  it('shows the models its rule picks, narrowest first, never one taken off the site', async () => {
    await renderAt('/guias/medidas-tocador');
    const models = await screen.findByRole('region', { name: 'Modelos que encajan' });
    const links = within(models)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining(['/tocadores/Tocador-B', '/tocadores/Tocador-A']));
    expect(links.indexOf('/tocadores/Tocador-B')).toBeLessThan(
      links.indexOf('/tocadores/Tocador-A'),
    );
    expect(links).not.toContain('/tocadores/Tocador-Off');
    expect(within(models).getByRole('link', { name: 'Ver todos: Tocadores' })).toBeTruthy();
  });

  it('follows a link in its text without reloading the app', async () => {
    await renderAt('/guias/medidas-tocador');
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('link', { name: 'the dressing tables' }));
    expect(screen.getByTestId('where').textContent).toBe('/tocadores');
  });

  it('is in English under /en, its links too', async () => {
    await renderAt('/en/guias/medidas-tocador');
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Dimensions title');
    expect(screen.getByText(/Updated/).textContent).toContain('29 October 2026');
    expect(screen.getByRole('link', { name: 'the dressing tables' }).getAttribute('href')).toBe(
      '/en/tocadores',
    );
  });

  it('answers 404 for an article that is not published', async () => {
    await renderAt('/guias/borrador');
    expect(await screen.findByText('404')).toBeTruthy();
  });
});

describe('the guides section page', () => {
  beforeEach(() => {
    fixture.guides.splice(0, fixture.guides.length, { ...fixture.article, products: undefined });
  });

  it('lists the guides under their topic', async () => {
    await renderAt('/guias');
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Guías y consejos');
    const topic = screen.getByRole('region', { name: 'Tocadores' });
    expect(
      within(topic)
        .getByRole('link', { name: /Medidas title/ })
        .getAttribute('href'),
    ).toBe('/guias/medidas-tocador');
  });

  it('has no page while nothing is published', async () => {
    fixture.guides.splice(0, fixture.guides.length);
    await renderAt('/guias');
    expect(await screen.findByText('404')).toBeTruthy();
  });
});
