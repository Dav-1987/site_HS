import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { CatalogProvider } from '../catalog/CatalogContext.jsx';
import Header from './Header.jsx';
import { isPromoBarActive } from '../data/promoBar.js';

function renderHeader(props, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SettingsProvider>
        <LanguageProvider>
          <CatalogProvider>
            <Header {...props} />
          </CatalogProvider>
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

describe('isPromoBarActive', () => {
  it('runs through the last minute of 15 November in Madrid', () => {
    expect(isPromoBarActive(Date.parse('2026-11-11T00:00:00+01:00'))).toBe(true);
    expect(isPromoBarActive(Date.parse('2026-11-15T23:59:00+01:00'))).toBe(true);
  });

  it('is gone from midnight on 16 November', () => {
    expect(isPromoBarActive(Date.parse('2026-11-16T00:00:00+01:00'))).toBe(false);
    expect(isPromoBarActive(Date.parse('2026-12-01T12:00:00+01:00'))).toBe(false);
  });
});

describe('Header promo strip', () => {
  it('shows the Black Friday strip as a link to the dressing tables', () => {
    renderHeader({ promo: true });
    const link = screen.getByText('Black Friday').closest('a');
    expect(link.getAttribute('href')).toBe('/tocadores');
    expect(link.textContent).toContain('11.11');
    expect(screen.getByText('Descuentos espectaculares').closest('a')).toBe(link);
    expect(link.textContent).toContain('del 11 al 15 de noviembre');
    expect(link.textContent).toContain('¡Aproveche las ofertas!');
  });

  it('speaks English on the English site', () => {
    renderHeader({ promo: true }, '/en');
    const link = screen.getByText('Black Friday').closest('a');
    expect(link.getAttribute('href')).toBe('/en/tocadores');
    expect(link.textContent).toContain('Spectacular discounts');
    expect(link.textContent).toContain('from 11 to 15 November');
  });

  it('is not there once the promo is over', () => {
    renderHeader({ promo: false });
    expect(screen.queryByText('Black Friday')).toBeNull();
  });
});
