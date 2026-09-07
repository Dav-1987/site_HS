import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WallapopPanel from '../pages/WallapopPanel.jsx';
import { expectedCategoryTotal, expectedPanelTotal } from '../test/wallapopCounts.js';

const api = vi.hoisted(() => ({
  loadWallapopState: vi.fn(),
  saveWallapopState: vi.fn(),
}));

vi.mock('./api.js', () => api);

// Both cases render the whole approved catalog — every product a card of its
// own, with an image and controls — which is slow in jsdom and started tipping
// over the default 5s timeout once the suite grew enough to run this file
// alongside everything else. Scoped to this file rather than raised globally,
// so the default stays a useful guard everywhere else.
vi.setConfig({ testTimeout: 20000 });

describe('WallapopPanel', () => {
  beforeEach(() => {
    api.loadWallapopState.mockReset();
    api.saveWallapopState.mockReset();
    api.loadWallapopState.mockResolvedValue({ version: 1, updatedAt: null, products: {} });
    api.saveWallapopState.mockImplementation(async (state) => state);
  });

  it('shows every approved product and persists status changes', async () => {
    render(<WallapopPanel />);

    expect(await screen.findByRole('heading', { name: 'Wallapop' })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(expectedPanelTotal));

    const firstCard = screen.getAllByRole('article')[0];
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Опубликован' }));

    await waitFor(() => {
      const latestState = api.saveWallapopState.mock.calls.at(-1)[0];
      const changedRecord = Object.values(latestState.products).find(
        (record) => record.status === 'published',
      );
      expect(changedRecord).toBeTruthy();
    });
  });

  it('filters the panel by site category', async () => {
    render(<WallapopPanel />);
    await screen.findByRole('heading', { name: 'Wallapop' });
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(expectedPanelTotal));

    fireEvent.change(screen.getByLabelText('Категория сайта'), {
      target: { value: 'estanterias' },
    });

    // Asserted to be non-empty first: a renamed category would make the count
    // zero, and "no cards" would then match "no cards" and pass while every
    // shelf had quietly vanished from the panel — the exact failure the slug
    // assertions at the top of listings.test.js exist to catch.
    const shelves = expectedCategoryTotal('estanterias');
    expect(shelves).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(shelves));
  });
});
