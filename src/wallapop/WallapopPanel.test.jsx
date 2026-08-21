import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WallapopPanel from '../pages/WallapopPanel.jsx';

const api = vi.hoisted(() => ({
  loadWallapopState: vi.fn(),
  saveWallapopState: vi.fn(),
}));

vi.mock('./api.js', () => api);

// Both cases render the whole approved catalog — 56 cards, each with its own
// image and controls — which is slow in jsdom and started tipping over the
// default 5s timeout once the suite grew enough to run this file alongside
// everything else. Scoped to this file rather than raised globally, so the
// default stays a useful guard everywhere else.
vi.setConfig({ testTimeout: 20000 });

describe('WallapopPanel', () => {
  beforeEach(() => {
    api.loadWallapopState.mockReset();
    api.saveWallapopState.mockReset();
    api.loadWallapopState.mockResolvedValue({ version: 1, updatedAt: null, products: {} });
    api.saveWallapopState.mockImplementation(async (state) => state);
  });

  it('shows the 56 approved products and persists status changes', async () => {
    render(<WallapopPanel />);

    expect(await screen.findByRole('heading', { name: 'Wallapop' })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(56));

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
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(56));

    fireEvent.change(screen.getByLabelText('Категория сайта'), {
      target: { value: 'estanterias' },
    });

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(10));
  });
});
