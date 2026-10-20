import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as api from '../api.js';
import RebuildButton from './RebuildButton.jsx';

vi.mock('../api.js', () => ({ fetchRebuildStatus: vi.fn(), triggerRebuild: vi.fn() }));

const completed = (conclusion, createdAt = new Date()) => ({
  configured: true,
  run: { status: 'completed', conclusion, createdAt: createdAt.toISOString(), url: '#' },
});

describe('RebuildButton', () => {
  it('says when the pages for search engines were last built', async () => {
    const createdAt = new Date();
    createdAt.setHours(9, 5, 0, 0);
    api.fetchRebuildStatus.mockResolvedValue(completed('success', createdAt));
    render(<RebuildButton />);
    expect(await screen.findByText('Собран сегодня, 09:05')).toBeTruthy();
  });

  it('says plainly when the last build failed', async () => {
    api.fetchRebuildStatus.mockResolvedValue(completed('failure'));
    render(<RebuildButton />);
    expect(await screen.findByText('Сборка не удалась')).toBeTruthy();
  });

  it('is not there at all until the server is set up for it', async () => {
    api.fetchRebuildStatus.mockResolvedValue({ configured: false });
    const { container } = render(<RebuildButton />);
    await waitFor(() => expect(api.fetchRebuildStatus).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toBe(''));
  });
});
