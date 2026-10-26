import { describe, it, expect } from 'vitest';
import { productSiteLink } from './siteLink.js';

const espejos = { slug: 'espejos', name: { es: 'Espejos' }, products: [] };
const otros = (visibility) => ({ slug: 'otros-modelos', visibility, products: [] });
const catalog = (...extra) => [espejos, ...extra];

describe('productSiteLink', () => {
  it('opens the page of a product that is on the site, hidden from listings or not', () => {
    for (const visibility of [undefined, 'public', 'unlisted']) {
      const product = { id: 'Espejo-K01', name: 'Espejo | Redondo', visibility };
      expect(productSiteLink(catalog(), product, espejos)).toEqual({
        href: '/espejos/Espejo-K01',
        label: 'Открыть на сайте',
        live: true,
      });
    }
  });

  it('names the section a switched-off product’s address leads to', () => {
    const product = { id: 'Espejo-Alto-D05', name: 'Espejo | de pie', visibility: 'off' };
    expect(productSiteLink(catalog(), product, espejos)).toEqual({
      href: '/espejos/Espejo-Alto-D05',
      label: 'Адрес на сайте (ведёт в «Espejos»)',
      live: false,
    });
  });

  it('counts a product in a switched-off section as switched off', () => {
    const section = otros('off');
    const mirror = { id: 'Espejo-Alto-D02', name: 'Espejo | Arqueado' };
    const shelf = { id: 'Estanteria-E-09', name: 'Estantería | Gris' };
    expect(productSiteLink(catalog(section), mirror, section).label).toBe(
      'Адрес на сайте (ведёт в «Espejos»)',
    );
    expect(productSiteLink(catalog(section), shelf, section)).toMatchObject({
      href: '/otros-modelos/Estanteria-E-09',
      label: 'Адрес на сайте (ведёт в каталог)',
    });
  });
});
