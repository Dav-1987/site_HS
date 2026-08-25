import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import SocialMeta from './SocialMeta.jsx';

// React 19 hoists <meta> into the document head, which is where a scraper looks
// and therefore where these assertions have to look too.
const meta = (property) =>
  document.head.querySelector(`meta[property="${property}"]`)?.getAttribute('content');

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

  // The feed sends the pre-discount price as `price` so Shopping can draw a
  // struck-through pair. A link preview has no room for that, so here the
  // number must be what the customer actually pays.
  it('prices a discounted product at what it actually costs', () => {
    renderMeta({ type: 'product', product });
    expect(meta('product:price:amount')).toBe('299.00');
  });

  it('follows the stock switch', () => {
    renderMeta({ type: 'product', product: { ...product, inStock: false } });
    expect(meta('product:availability')).toBe('out of stock');
    // Still priced — unavailable is not the same as unlisted.
    expect(meta('product:price:amount')).toBe('299.00');
  });

  // /admin can save a product before its price is set; a zero price must not
  // become a "0.00 EUR" offer in someone's chat preview.
  it('emits nothing for a product with no price', () => {
    renderMeta({ type: 'product', product: { ...product, price: 0, oldPrice: 0 } });
    expect(meta('product:price:amount')).toBeUndefined();
    expect(meta('product:brand')).toBeUndefined();
  });
});
