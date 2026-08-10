import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import RouteFallback from '../components/RouteFallback.jsx';
import Reveal from '../components/Reveal.jsx';

describe('shared accessibility behavior', () => {
  it('announces lazy-route loading instead of rendering a blank screen', () => {
    render(
      <MemoryRouter>
        <SettingsProvider>
          <LanguageProvider>
            <RouteFallback />
          </LanguageProvider>
        </SettingsProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: /Cargando contenido/i })).toBeTruthy();
  });

  it('waits for dynamic stagger children without asking GSAP to animate an empty target', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<Reveal stagger>{null}</Reveal>);

    rerender(
      <Reveal stagger>
        <div>Loaded card</div>
      </Reveal>,
    );

    await waitFor(() => expect(screen.getByText('Loaded card').style.opacity).toBe('1'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
