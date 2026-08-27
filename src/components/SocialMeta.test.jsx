import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import SocialMeta from './SocialMeta.jsx';

// React 19 hoists <meta> into the document head, which is where a scraper looks
// and therefore where these assertions have to look too.
const meta = (property) =>
  document.head.querySelector(`meta[property="${property}"]`)?.getAttribute('content');

const metaAll = (property) =>
  [...document.head.querySelectorAll(`meta[property="${property}"]`)].map((m) =>
    m.getAttribute('content'),
  );

function renderMeta(props) {
  return render(
    <SettingsProvider>
      <SocialMeta
        title="Espejo 80 × 180 cm | Mirage Muebles"
        description="Un espejo."
        url="https://hsmuebles.es/espejos/Espejo-Alto-F-07"
        {...props}
      />
    </SettingsProvider>,
  );
}

const product = {
  id: 'Espejo-Alto-F-07',
  name: 'Espejo',
  subtitle: '80 × 180 cm',
  price: 299,
  oldPrice: 400,
  media: [{ type: 'image', src: '/uploads/a.jpg' }],
};

beforeEach(() => {
  document.head.querySelectorAll('meta').forEach((m) => m.remove());
});

describe('SocialMeta — the tags every page gets', () => {
  it('emits the Open Graph basics', () => {
    renderMeta({});
    expect(meta('og:site_name')).toBe('Mirage Muebles');
    expect(meta('og:url')).toBe('https://hsmuebles.es/espejos/Espejo-Alto-F-07');
    expect(meta('og:type')).toBe('website');
  });

  // Without a product there is nothing to price, and a page that is not a
  // product must not claim to be one.
  it('emits no product tags for an ordinary page', () => {
    renderMeta({});
    expect(meta('product:price:amount')).toBeUndefined();
    expect(meta('product:availability')).toBeUndefined();
    expect(meta('og:availability')).toBeUndefined();
  });

  it('falls back to a single og:image when no gallery is passed', () => {
    renderMeta({ image: '/uploads/a_1600.webp' });
    expect(metaAll('og:image')).toEqual(['https://hsmuebles.es/uploads/a_1600.webp']);
  });
});

// og:type="product" alone only declares "this is a product page". Facebook and
// Instagram read the price from the product: namespace, and without it they do
// not treat the page as something for sale — which is what kept our product
// URLs from resolving in Instagram's product-link search, and why link previews
// never showed a price.
describe('SocialMeta — product tags', () => {
  it('carries price, currency, availability, condition, brand and id', () => {
    renderMeta({ type: 'product', product });
    expect(meta('product:price:amount')).toBe('299.00');
    expect(meta('product:price:currency')).toBe('EUR');
    expect(meta('product:availability')).toBe('in stock');
    expect(meta('product:condition')).toBe('new');
    expect(meta('product:brand')).toBe('Mirage Muebles');
    expect(meta('product:retailer_item_id')).toBe('Espejo-Alto-F-07');
  });

  // Pinterest reads availability under its own property name rather than
  // Meta's `product:availability` — both are emitted so neither platform is
  // left reading nothing.
  it("also carries availability under Pinterest's own property", () => {
    renderMeta({ type: 'product', product });
    expect(meta('og:availability')).toBe('instock');
  });

  it('follows the stock switch under both property names', () => {
    renderMeta({ type: 'product', product: { ...product, inStock: false } });
    expect(meta('product:availability')).toBe('out of stock');
    expect(meta('og:availability')).toBe('out of stock');
  });

  // Up to six og:image tags for the gallery Pinterest picks the best pin
  // image from; Twitter still gets only the one image passed as `image`.
  it('emits every gallery photo as its own og:image, capped at six', () => {
    const images = Array.from({ length: 8 }, (_, i) => `/uploads/p${i}.jpg`);
    renderMeta({ type: 'product', product, images });
    expect(metaAll('og:image')).toEqual(
      images.slice(0, 6).map((src) => `https://hsmuebles.es${src.replace('.jpg', '_1600.webp')}`),
    );
  });

  // The feed sends the pre-discount price as `price` so Shopping can draw a
  // struck-through pair. A link preview has no room for that, so here the
  // number must be what the customer actually pays.
  it('prices a discounted product at what it actually costs', () => {
    renderMeta({ type: 'product', product });
    expect(meta('product:price:amount')).toBe('299.00');
  });

  it('stays priced when out of stock — unavailable is not the same as unlisted', () => {
    renderMeta({ type: 'product', product: { ...product, inStock: false } });
    expect(meta('product:price:amount')).toBe('299.00');
  });

  // /admin can save a product before its price is set; a zero price must not
  // become a "0.00 EUR" offer in someone's chat preview.
  it('emits nothing for a product with no price', () => {
    renderMeta({ type: 'product', product: { ...product, price: 0, oldPrice: 0 } });
    expect(meta('product:price:amount')).toBeUndefined();
    expect(meta('product:brand')).toBeUndefined();
    expect(meta('og:availability')).toBeUndefined();
  });
});
