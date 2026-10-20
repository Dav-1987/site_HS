import { describe, expect, it } from 'vitest';
import { ADMIN_SECTIONS, newOrdersLabel, sectionFor } from './adminSections.js';

describe('newOrdersLabel', () => {
  it('agrees in number with the count, the Russian way', () => {
    expect(newOrdersLabel(1)).toBe('1 новая');
    expect(newOrdersLabel(3)).toBe('3 новые');
    expect(newOrdersLabel(5)).toBe('5 новых');
    expect(newOrdersLabel(11)).toBe('11 новых');
    expect(newOrdersLabel(21)).toBe('21 новая');
    expect(newOrdersLabel(22)).toBe('22 новые');
  });
});

describe('sectionFor', () => {
  it('finds the section from the first segment under /admin', () => {
    expect(sectionFor('/admin/orders')?.title).toBe('Заявки');
    expect(sectionFor('/admin/catalog/tocadores')?.path).toBe('catalog');
  });

  it('has none for /admin itself or an unknown segment', () => {
    expect(sectionFor('/admin')).toBeNull();
    expect(sectionFor('/admin/nope')).toBeNull();
  });

  it('gives every section a phone label no longer than its title', () => {
    for (const s of ADMIN_SECTIONS) expect(s.title.startsWith(s.short)).toBe(true);
  });
});
