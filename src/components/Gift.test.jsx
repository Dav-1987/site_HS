import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GiftBadge, GiftLine } from './Gift.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';

const gift = {
  name: 'Estantería 60 × 180 cm',
  shortName: 'Estantería',
  image: '/uploads/shelf.jpg',
  href: '/estanterias/Estanteria-E-03',
  price: 89,
};

function renderLine({ offer = gift, ...props } = {}) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <GiftLine gift={offer} {...props} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('GiftLine', () => {
  it('names the gift with its dimensions', () => {
    renderLine();
    expect(screen.getByText(/Estantería 60 × 180 cm/)).toBeTruthy();
  });

  // The name opens the same dialog as the inset on the photo, instead of the
  // gift's own page: it answers "what am I getting" without taking anyone off
  // the piece they were about to buy.
  it('opens the gift dialog from the name, and links nowhere', () => {
    const onOpen = vi.fn();
    const { container } = renderLine({ onOpen });
    expect(container.querySelector('a')).toBeNull();
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  // Inside the order dialog there is nothing to open: a second dialog over the
  // one being filled in would stack two focus traps.
  it('leaves the name as plain text where nothing opens', () => {
    const { container } = renderLine();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText(/Estantería 60 × 180 cm/)).toBeTruthy();
  });

  // The figure is struck through and the word before it is not: the number is
  // what the piece would have cost, while a line through "valor" would read as
  // the offer itself being withdrawn.
  it('states the value of the gift, with the figure struck through', () => {
    const { container } = renderLine();
    expect(screen.getByText(/valor/)).toBeTruthy();
    const struck = container.querySelector('.line-through');
    expect(struck).toBeTruthy();
    expect(struck.textContent.replace(/\s+/g, ' ').trim()).toBe('89 €');
  });

  // The order dialog is already tall enough to push its submit button off the
  // bottom of a phone screen. The value is an argument for buying and it has
  // already been made on the product page; what is left to say in the form is
  // only that the gift comes with this order.
  it('drops the value in the order form, keeping the gift on one line', () => {
    renderLine({ compact: true });
    expect(screen.queryByText(/valor/)).toBeNull();
    expect(screen.getByText(/Estantería 60 × 180 cm/)).toBeTruthy();
  });

  // The line under the price is the one thing on the page saying something the
  // price does not, so it announces itself twice on arrival. In the order form
  // it must not: that line sits above fields the visitor is about to fill in,
  // and movement beside a text input is a distraction, not an announcement.
  it('pulses on arrival under the price, and never in the order form', () => {
    const { container: page } = renderLine();
    expect(page.querySelector('p').className).toContain('animate-gift-pulse');
    const { container: form } = renderLine({ compact: true });
    expect(form.querySelector('p').className).not.toContain('animate-gift-pulse');
  });

  // The kind of gift the old link could never serve: no page to point at. The
  // dialog is the one answer that works for both kinds, so it opens here too.
  it('still opens the dialog for a gift the shop does not sell', () => {
    const onOpen = vi.fn();
    const { container } = renderLine({ offer: { ...gift, href: null, price: null }, onOpen });
    expect(container.querySelector('a')).toBeNull();
    fireEvent.click(container.querySelector('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there is no gift', () => {
    const { container } = renderLine({ offer: null });
    expect(container.textContent).toBe('');
  });
});

describe('GiftBadge', () => {
  const catalog = [
    {
      slug: 'tocadores',
      name: { es: 'Tocadores', en: 'Dressing tables' },
      gift: { source: 'catalog', productId: 'shelf' },
      products: [{ id: 'table', name: 'Tocador', price: 100 }],
    },
    {
      slug: 'estanterias',
      name: { es: 'Estanterías', en: 'Shelves' },
      products: [
        {
          id: 'shelf',
          name: 'Estantería | de pared',
          subtitle: '60 × 180 cm',
          price: 89,
          images: ['/uploads/shelf.jpg'],
        },
      ],
    },
  ];

  const renderBadge = (id = 'table') =>
    render(
      <MemoryRouter>
        <SettingsProvider>
          <LanguageProvider>
            <CatalogProvider initialCatalog={catalog}>
              <GiftBadge product={{ id }} />
            </CatalogProvider>
          </LanguageProvider>
        </SettingsProvider>
      </MemoryRouter>,
    );

  it('marks a product its category gives something away with', () => {
    const { container } = renderBadge();
    expect(container.textContent).toContain('Estantería de regalo');
  });

  it('says nothing on a product with no gift', () => {
    const { container } = renderBadge('shelf');
    expect(container.textContent).toBe('');
  });

  // The label is written in /admin and opens with a "+". It has to be its own
  // element: left inside the sentence, the second line of a label that wraps on
  // a narrow tile starts under the plus instead of under the first letter.
  it('sets the leading plus apart so a wrapped line aligns with the text', () => {
    const { container } = renderBadge();
    const parts = [...container.querySelectorAll('span > span')].map((el) => el.textContent);
    expect(parts).toContain('+');
    expect(parts).toContain('Estantería de regalo');
  });
});
