import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));

vi.mock('./db.js', () => ({
  default: { query: db.query, connect: db.connect },
}));

import { readCatalog, writeCatalog } from './store.js';

beforeEach(() => {
  vi.clearAllMocks();
  db.query.mockResolvedValue({ rows: [] });
  db.clientQuery.mockResolvedValue({ rows: [] });
  db.connect.mockResolvedValue({ query: db.clientQuery, release: db.release });
});

describe('home catalog database field', () => {
  it('writes the selected flag to the products column', async () => {
    await writeCatalog([
      {
        slug: 'espejos',
        name: { es: 'Espejos', en: 'Mirrors' },
        products: [{ id: 'mirror-1', name: 'Espejo', onHomeCatalog: true }],
      },
    ]);

    const insert = db.clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO products'));
    expect(insert[0]).toContain('on_home_catalog');
    expect(insert[1][25]).toBe(true);
    expect(insert[1]).toHaveLength(31);
  });

  it('reads the selected flag from a product row', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ slug: 'espejos', name_es: 'Espejos', name_en: 'Mirrors' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'mirror-1', category_slug: 'espejos', on_home_catalog: true }],
      });

    const catalog = await readCatalog();
    expect(catalog[0].products[0].onHomeCatalog).toBe(true);
  });
});
