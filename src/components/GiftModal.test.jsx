import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GiftModal from './GiftModal.jsx';
import { GiftInset } from './Gift.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';

// A gift the shop sells: everything below comes from the product it points at.
const catalogGift = {
  name: 'Estantería 60 × 180 cm',
  shortName: 'Estantería',
  image: '/uploads/shelf.jpg',
  images: ['/uploads/shelf.jpg', '/uploads/shelf-2.jpg'],
  size: '60 × 180 cm',
  href: '/estanterias/Estanteria-E-03',
  price: 89,
};

// One the shop does not: same shape, typed by hand, and no page to link to.
const customGift = {
  name: 'Funda protectora 120 cm',
  shortName: 'Funda protectora',
  image: '/uploads/cover.jpg',
  images: ['/uploads/cover.jpg'],
  size: '120 cm',
  href: null,
  price: 35,
};

function renderModal({ gift = catalogGift, isOpen = true, onClose = () => {} } = {}) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <GiftModal gift={gift} isOpen={isOpen} onClose={onClose} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

function renderInset(props = {}) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <GiftInset gift={catalogGift} {...props} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('GiftInset', () => {
  // The whole point of the change: the mark in the corner of the photo is what
  // opens the dialog, so it has to be a real control, not a decorated div.
  it('is a button that opens the gift when something listens', () => {
    const onOpen = vi.fn();
    const { container } = renderInset({ onOpen });
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('names what it opens, for anyone who cannot see the thumbnail', () => {
    const { container } = renderInset({ onOpen: () => {} });
    expect(container.querySelector('button').getAttribute('aria-label')).toContain(
      'Estantería 60 × 180 cm',
    );
  });

  // Without a handler it stays what it was, or it would swallow clicks meant
  // for the zoom that covers the whole photo underneath it.
  it('takes no clicks where nothing opens', () => {
    const { container } = renderInset();
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('.pointer-events-none')).toBeTruthy();
  });

  it('shows nothing at all for a gift with no photo', () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsProvider>
          <LanguageProvider>
            <GiftInset gift={{ ...catalogGift, image: '' }} onOpen={() => {}} />
          </LanguageProvider>
        </SettingsProvider>
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('GiftModal', () => {
  it('renders nothing until it is opened', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('names the gift and its dimensions', () => {
    renderModal();
    expect(screen.getByText('Estantería')).toBeTruthy();
    expect(screen.getByText(/60 × 180 cm/)).toBeTruthy();
  });

  // The number is what the piece would have cost. Struck through, with the
  // actual price — free — beside it.
  it('strikes the value through and says the gift is free', () => {
    const { container } = renderModal();
    const struck = container.querySelector('.line-through');
    expect(struck.textContent.replace(/\s+/g, ' ').trim()).toBe('89 €');
    expect(screen.getByText('Gratis')).toBeTruthy();
  });

  it('says nothing about a price the offer keeps to itself', () => {
    const { container } = renderModal({ gift: { ...catalogGift, price: null } });
    expect(container.querySelector('.line-through')).toBeNull();
    expect(screen.queryByText('Gratis')).toBeNull();
  });

  it('offers the way to the gift’s own page', () => {
    const { container } = renderModal();
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/estanterias/Estanteria-E-03');
  });

  // A gift the shop does not sell has no page, and a link to nowhere is worse
  // than no link.
  it('offers no link for a gift that is not a product', () => {
    const { container } = renderModal({ gift: customGift });
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Funda protectora')).toBeTruthy();
  });

  it('shows a thumbnail per photo, and only when there is more than one', () => {
    const { container: many } = renderModal();
    // The close button, the main photo, and one thumbnail per image.
    expect(many.querySelectorAll('button').length).toBe(2 + catalogGift.images.length);

    const { container: one } = renderModal({ gift: customGift });
    expect(one.querySelectorAll('button').length).toBe(2);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    fireEvent.click(container.querySelector('[aria-hidden="true"]'));
    expect(onClose).toHaveBeenCalled();
  });

  // Between the two layers it has to live between: over the cookie banner at
  // z-90, which was painting across its backdrop, and under the Lightbox it
  // opens at z-100, which is meant to cover it.
  it('sits over the cookie banner and under the zoom it opens', () => {
    const { container } = renderModal();
    expect(container.querySelector('[role="dialog"]').className).toContain('z-[95]');
  });

  it('is announced as a modal dialog named after the gift', () => {
    const { container } = renderModal();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // getElementById rather than a selector: useId() ids carry colons, which
    // querySelector reads as a pseudo-class.
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'));
    expect(title.textContent).toBe('Estantería');
  });
});
