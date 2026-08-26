import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { SettingsProvider } from '../settings/SettingsContext.jsx';
import ExpandableText from './ExpandableText.jsx';

function renderText(text) {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <LanguageProvider>
          <ExpandableText text={text} />
        </LanguageProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

// The descriptions arrive as one unbroken block of about 500 characters. Read
// out in full it filled most of a phone screen before the price, the size or
// the order button — so the opening paragraph is clamped to four lines and the
// rest of it opens on demand.
const LONG = [
  'Este espejo Hollywood de cuerpo entero destaca por su amplio marco blanco y sus',
  'bombillas LED distribuidas alrededor del cristal, que proporcionan una luz uniforme',
  'para maquillarse, peinarse y elegir cada look. Su gran formato permite verse de pies',
  'a cabeza y aporta luminosidad y sensación de amplitud.',
].join(' ');

describe('ExpandableText', () => {
  it('clamps a long single paragraph and opens it on demand', () => {
    const { container } = renderText(LONG);
    const paragraph = container.querySelector('p');

    expect(paragraph.className).toContain('line-clamp-4');
    fireEvent.click(screen.getByText(/Ver más/i));
    expect(container.querySelector('p').className).not.toContain('line-clamp-4');
  });

  it('leaves a paragraph that cannot fill four lines alone', () => {
    const { container } = renderText('Espejo de pie con marco dorado y ruedas.');

    expect(container.querySelector('p').className).not.toContain('line-clamp-4');
    expect(screen.queryByText(/Ver más/i)).toBeNull();
  });

  // The whole description is in the markup whether it is open or not: text
  // inserted on click is text a crawler never sees, and these were written to
  // be found. Collapsing is CSS.
  it('keeps every paragraph in the markup while collapsed', () => {
    const { container } = renderText(`${LONG}\n\n🎁 Bombillas LED de regalo`);

    expect(container.textContent).toContain('Bombillas LED de regalo');
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelectorAll('p')[1].className).toContain('hidden');
  });
});
