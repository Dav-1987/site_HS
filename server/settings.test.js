import { describe, expect, it } from 'vitest';
import { mergeSettings } from './settings.js';

describe('server settings — home catalog', () => {
  it('keeps the new block enabled for older settings and persists its switch', () => {
    expect(mergeSettings({}).blocks.homeCatalog).toBe(true);
    expect(mergeSettings({}).blocks.homeCatalogDesktop).toBe(true);
    expect(mergeSettings({ blocks: { homeCatalog: false } }).blocks.homeCatalog).toBe(false);
    expect(mergeSettings({ blocks: { homeCatalogDesktop: false } }).blocks.homeCatalogDesktop).toBe(
      false,
    );
  });

  it('keeps the edited section title', () => {
    const texts = { es: { 'section.homeCatalog.title': 'Ofertas' }, en: {} };
    expect(mergeSettings({ texts }).texts.es['section.homeCatalog.title']).toBe('Ofertas');
  });

  it('persists the chosen product order without duplicate ids', () => {
    expect(mergeSettings({}).homeCatalogOrder).toEqual([]);
    expect(mergeSettings({ homeCatalogOrder: [' B ', 'A', 'B', null] }).homeCatalogOrder).toEqual([
      'B',
      'A',
    ]);
  });
});

describe('server settings — home navigation', () => {
  it('persists independently enabled scroll links and keeps old settings unchanged', () => {
    expect(mergeSettings({}).homeNavigation).toEqual({
      catalogScroll: false,
      contactsScroll: false,
    });
    expect(
      mergeSettings({ homeNavigation: { catalogScroll: true, contactsScroll: true } })
        .homeNavigation,
    ).toEqual({ catalogScroll: true, contactsScroll: true });
    expect(
      mergeSettings({ homeNavigation: { catalogScroll: 'true' } }).homeNavigation.catalogScroll,
    ).toBe(false);
  });
});
