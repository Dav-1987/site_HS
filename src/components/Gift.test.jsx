import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GiftLine } from './Gift.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';

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
    expect(screen.getByText('Estantería 60 × 180 cm')).toBeTruthy();
  });

  it('links the name to the gift’s own page', () => {
    const { container } = renderLine();
    expect(container.querySelector('a').getAttribute('href')).toBe('/estanterias/Estanteria-E-03');
  });

  // Inside the order dialog: following the link would carry someone out of a
  // half-filled form, and the anchor would join the dialog's focus trap.
  it('drops the link where following it would be the wrong move', () => {
    const { container } = renderLine({ linked: false });
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText(/Estantería 60 × 180 cm/)).toBeTruthy();
  });

  it('has no link for a gift the shop does not sell', () => {
    const { container } = renderLine({ offer: { ...gift, href: null, price: null } });
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders nothing when there is no gift', () => {
    const { container } = renderLine({ offer: null });
    expect(container.textContent).toBe('');
  });
});
