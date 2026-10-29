import { describe, it, expect } from 'vitest';
import { buildRoutes } from './routes.js';

// cat(slug, ...products) where a product is either an id or [id, visibility]
const cat = (slug, visibility, ...products) => ({
  slug,
  visibility,
  updatedAt: '2026-08-01T00:00:00.000Z',
  products: products.map((p) =>
    Array.isArray(p)
      ? { id: p[0], visibility: p[1], updatedAt: '2026-08-01T00:00:00.000Z' }
      : { id: p, updatedAt: '2026-08-01T00:00:00.000Z' },
  ),
});

const paths = (catalog, settings) => buildRoutes(catalog, settings).map((r) => r.path);

describe('buildRoutes', () => {
  it('lists the static pages plus every category and product', () => {
    expect(paths([cat('c1', undefined, 'p1', 'p2')])).toEqual([
      '/',
      '/catalogo',
      '/contacto',
      '/privacy-policy',
      '/legal-notice',
      '/envios',
      '/devoluciones',
      '/opiniones',
      '/c1',
      '/c1/p1',
      '/c1/p2',
    ]);
  });

  it('keeps unlisted sections and products — they stay live and indexed', () => {
    const out = paths([cat('c1', 'unlisted', 'p1', ['p2', 'unlisted'])]);
    expect(out).toContain('/c1');
    expect(out).toContain('/c1/p1');
    expect(out).toContain('/c1/p2');
  });

  it('drops an off product but keeps the rest of its section', () => {
    const out = paths([cat('c1', undefined, 'p1', ['p2', 'off'])]);
    expect(out).toContain('/c1');
    expect(out).toContain('/c1/p1');
    expect(out).not.toContain('/c1/p2');
  });

  it('drops an off section together with all of its products', () => {
    const out = paths([cat('c1', 'off', 'p1'), cat('c2', undefined, 'p2')]);
    expect(out).not.toContain('/c1');
    expect(out).not.toContain('/c1/p1');
    expect(out).toContain('/c2');
    expect(out).toContain('/c2/p2');
  });
});

// Раздел отзывов выключается тумблером в /admin. Выключенный не должен
// получать ни пререндер-снимок, ни строку в sitemap — иначе nginx продолжит
// отдавать старый HTML вместо 404, а Google будет держать страницу в индексе.
describe('buildRoutes — выключенный раздел отзывов', () => {
  it('убирает /opiniones, когда блок выключен', () => {
    const out = paths([cat('c1', undefined, 'p1')], { blocks: { reviews: false } });
    expect(out).not.toContain('/opiniones');
  });

  it('оставляет /opiniones при включённом блоке и без настроек вовсе', () => {
    expect(paths([cat('c1', undefined, 'p1')], { blocks: { reviews: true } })).toContain(
      '/opiniones',
    );
    expect(paths([cat('c1', undefined, 'p1')])).toContain('/opiniones');
  });

  // Тумблер ленты на главной к маршруту отношения не имеет — страница живёт.
  it('не трогает маршрут, когда выключена только лента на главной', () => {
    const out = paths([cat('c1', undefined, 'p1')], { blocks: { reviewsHome: false } });
    expect(out).toContain('/opiniones');
  });
});

describe('buildRoutes — guides', () => {
  const guide = (slug, updatedAt) => ({ slug, updatedAt });
  const guideRoutes = (guides) =>
    buildRoutes([cat('c1', undefined, 'p1')], undefined, guides).filter((r) =>
      r.path.startsWith('/guias'),
    );

  it('gives the section and every published article a page', () => {
    expect(
      guideRoutes([guide('medidas-tocador', null), guide('espejo-hollywood', null)]).map(
        (r) => r.path,
      ),
    ).toEqual(['/guias', '/guias/medidas-tocador', '/guias/espejo-hollywood']);
  });

  // IndexNow reads what changed off <lastmod>.
  it('dates each article by its own last edit and the section by the latest', () => {
    const [section, older, newer] = guideRoutes([
      guide('a', '2026-10-01T10:00:00.000Z'),
      guide('b', '2026-10-20T10:00:00.000Z'),
    ]);
    expect(section.updatedAt).toBe('2026-10-20T10:00:00.000Z');
    expect(older.updatedAt).toBe('2026-10-01T10:00:00.000Z');
    expect(newer.updatedAt).toBe('2026-10-20T10:00:00.000Z');
  });

  it('leaves out a date it does not have rather than making one up', () => {
    const [section, article] = guideRoutes([guide('a', null)]);
    expect(section.updatedAt).toBeUndefined();
    expect(article.updatedAt).toBeUndefined();
  });

  // Nothing published: /guias has nothing to list and answers 404.
  it('has no section page while nothing is published', () => {
    expect(guideRoutes([])).toEqual([]);
    expect(guideRoutes(undefined)).toEqual([]);
  });
});
