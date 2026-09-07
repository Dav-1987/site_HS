import { beforeEach, describe, it, expect, vi } from 'vitest';
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
  // One jsdom document means one history stack shared by every test in the
  // file, so a dialog that pushed an entry leaves it behind for the next one.
  beforeEach(() => history.replaceState(null, ''));

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

  // Nothing here leads away. The dialog is opened from a product page to look
  // at what comes free with the piece being bought, and a link out of it is a
  // link away from that piece. The sentence under the price still names the
  // gift and still links it, for anyone who does want the page.
  it('never leads away, not even for a gift that is a product', () => {
    const { container } = renderModal();
    expect(container.querySelector('a')).toBeNull();

    const { container: custom } = renderModal({ gift: customGift });
    expect(custom.querySelector('a')).toBeNull();
    expect(screen.getByText('Funda protectora')).toBeTruthy();
  });

  it('carries arrows and one dot per photo', () => {
    const { container } = renderModal();
    expect(container.querySelector('[aria-label="Anterior"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Siguiente"]')).toBeTruthy();
    expect(container.querySelectorAll('[aria-label^="Ir a la pieza"]').length).toBe(
      catalogGift.images.length,
    );
  });

  it('leaves a single photo alone — nothing to page through', () => {
    const { container } = renderModal({ gift: customGift });
    expect(container.querySelector('[aria-label="Anterior"]')).toBeNull();
    expect(container.querySelectorAll('[aria-label^="Ir a la pieza"]').length).toBe(0);
    // The close button and the photo itself, and that is all.
    expect(container.querySelectorAll('button').length).toBe(2);
  });

  it('pages through the photos with the arrows, and wraps around', () => {
    const { container } = renderModal();
    const dots = () => [...container.querySelectorAll('[aria-label^="Ir a la pieza"]')];
    const current = () => dots().findIndex((d) => d.getAttribute('aria-current') === 'true');
    expect(current()).toBe(0);

    fireEvent.click(container.querySelector('[aria-label="Siguiente"]'));
    expect(current()).toBe(1);

    // Backwards off the first photo lands on the last, not on nothing.
    fireEvent.click(container.querySelector('[aria-label="Anterior"]'));
    fireEvent.click(container.querySelector('[aria-label="Anterior"]'));
    expect(current()).toBe(catalogGift.images.length - 1);
  });

  it('answers the arrow keys the way the zoom does', () => {
    const { container } = renderModal();
    const current = () =>
      [...container.querySelectorAll('[aria-label^="Ir a la pieza"]')].findIndex(
        (d) => d.getAttribute('aria-current') === 'true',
      );
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(current()).toBe(1);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(current()).toBe(0);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  // On a phone Back is the gesture people use to dismiss something covering
  // the screen. Without an entry of its own the dialog let it walk them off the
  // product page they were reading.
  //
  // These drive `popstate` directly rather than calling history.back(): jsdom
  // shares one history stack across a file and pops it asynchronously, so the
  // real thing tests jsdom's emulation more than it tests this dialog. What
  // matters here is the handler's rule — what it does with the state a pop
  // lands on.
  it('closes when the browser Back button is pressed', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    // The dialog pushed an entry of its own; Back is what takes it off.
    expect(history.state?.giftModal).toBe(true);

    // Landing anywhere that is not our own marker means our entry is the one
    // that just went — the page underneath is back, so the dialog is done.
    history.replaceState({}, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).toHaveBeenCalled();
  });

  // The zoom stacks its own entry on top of this one, so one Back press
  // reaches both listeners. The lower one has to recognise that what went was
  // the zoom's entry and stay put — and the same guard covers the
  // `history.back()` the Lightbox fires when it is dismissed by its own X,
  // which would otherwise close this dialog as a side effect.
  it('stays open when the pop belonged to the zoom above it', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    // A pop that lands back on our own marker means what went was the entry
    // above ours — the zoom's. This dialog is not the one being dismissed.
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(history.state?.giftModal).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('takes its history entry back off when closed any other way', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const { unmount } = renderModal();
    expect(history.state?.giftModal).toBe(true);

    // Closing by the X, the backdrop or Escape unmounts it; the entry has to
    // come off too, or the next Back would be swallowed doing nothing visible.
    unmount();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('leaves the stack alone when Back is what closed it', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const { unmount } = renderModal();

    history.replaceState({}, '');
    window.dispatchEvent(new PopStateEvent('popstate'));
    unmount();

    // The entry is already gone — popping a second time would step back past
    // the page the visitor came from.
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
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
