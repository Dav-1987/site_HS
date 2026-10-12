import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderModal from './OrderModal.jsx';
import { trackGoogleAdsLead, trackPixel } from '../lib/track.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';

// The form talks to four ad platforms on open and on submit. None of that is
// what these tests are about, and left real it fires network calls from jsdom.
vi.mock('../lib/track.js', () => ({
  trackPixel: vi.fn(),
  setPixelUserData: vi.fn(),
  buildUserData: vi.fn(() => ({})),
  getFbCookies: vi.fn(() => ({})),
  trackGoogleAdsLead: vi.fn(),
  trackGa4Lead: vi.fn(),
  buildGoogleUserData: vi.fn(() => ({})),
  setGoogleAdsUserData: vi.fn(),
  pushDataLayer: vi.fn(),
}));
vi.mock('../lib/attribution.js', () => ({ getAttribution: vi.fn(() => ({})) }));

const product = {
  id: 'Tocador-T-01',
  name: 'Tocador | blanco',
  price: 479,
  oldPrice: 600,
  size: '100 × 40 × 160 cm',
};

function renderModal({ isOpen = true, onClose = () => {} } = {}) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <OrderModal product={product} gift={null} isOpen={isOpen} onClose={onClose} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('OrderModal — the Back button', () => {
  // One jsdom document means one history stack shared by the whole file, so a
  // dialog that pushed an entry leaves it behind for the next test.
  beforeEach(() => history.replaceState(null, ''));

  it('pushes nothing while it is closed', () => {
    renderModal({ isOpen: false });
    expect(history.state?.orderModal).toBeFalsy();
  });

  // The half-filled form is the whole point: Back used to carry someone off
  // the product page in the middle of ordering.
  it('closes on Back instead of leaving the page', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    expect(history.state?.orderModal).toBe(true);

    // popstate directly rather than history.back(): jsdom shares one stack per
    // file and pops it asynchronously, so the real call tests jsdom's
    // emulation more than it tests this dialog.
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onClose).toHaveBeenCalled();
  });

  it('takes its entry back off when dismissed any other way', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const { unmount } = renderModal();
    expect(history.state?.orderModal).toBe(true);

    // The X, the backdrop or Escape: the entry has to come off too, or the
    // next Back would be swallowed doing nothing visible.
    unmount();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('leaves the stack alone when Back is what closed it', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    const { unmount } = renderModal();

    window.dispatchEvent(new PopStateEvent('popstate'));
    unmount();

    // Already gone — popping again would step past the page behind it.
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });
});

describe('OrderModal — Google Shopping test orders', () => {
  const STOREBOT =
    'Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

  beforeEach(() => {
    history.replaceState(null, '');
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    );
  });

  async function submitAs(userAgent) {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
    const { container } = renderModal();
    const set = (name, value) =>
      fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { value } });
    set('name', 'Lucía Pérez');
    set('phone', '612345678');
    set('postalCode', '28001');
    fireEvent.submit(container.querySelector('form'));
    // The success screen replaces the form — Storebot must see it too.
    await waitFor(() => expect(container.querySelector('form')).toBeNull());
    // SettingsProvider fetches too, so look for the order call by URL.
    expect(fetch).toHaveBeenCalledWith('/api/order', expect.anything());
    ua.mockRestore();
  }

  it('fires the Lead conversions for a real customer', async () => {
    await submitAs(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 347.0.0.21.95',
    );
    expect(trackPixel).toHaveBeenCalledWith('Lead', expect.anything(), expect.anything());
    expect(trackGoogleAdsLead).toHaveBeenCalledTimes(1);
  });

  it('shows Storebot the success screen but sends no Lead anywhere', async () => {
    await submitAs(STOREBOT);
    expect(trackPixel).not.toHaveBeenCalledWith('Lead', expect.anything(), expect.anything());
    expect(trackGoogleAdsLead).not.toHaveBeenCalled();
  });
});
