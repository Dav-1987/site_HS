import { describe, expect, it } from 'vitest';
import { mergeSettings } from './settings.js';

describe('server settings — home catalog', () => {
  it('keeps the new block enabled for older settings and persists its switch', () => {
    expect(mergeSettings({}).blocks.homeCatalog).toBe(true);
    expect(mergeSettings({ blocks: { homeCatalog: false } }).blocks.homeCatalog).toBe(false);
  });

  it('keeps the edited section title', () => {
    const texts = { es: { 'section.homeCatalog.title': 'Ofertas' }, en: {} };
    expect(mergeSettings({ texts }).texts.es['section.homeCatalog.title']).toBe('Ofertas');
  });
});
