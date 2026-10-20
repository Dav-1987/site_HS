import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FeaturedCardsEditor from './FeaturedCardsEditor.jsx';

const PRODUCTS = [
  { id: 'Espejo-F-01', name: 'Espejo', reference: 'F-01', categoryName: 'Espejos' },
];
const CARD = { productId: 'Espejo-F-01', cover: '', video: '' };

const renderWith = (blocks, cards = []) =>
  render(
    <FeaturedCardsEditor
      value={cards}
      onChange={() => {}}
      allProducts={PRODUCTS}
      blocks={blocks}
    />,
  );
const fold = () => screen.getByRole('button', { name: /^Избранное/ });

describe('FeaturedCardsEditor — where the carousel shows', () => {
  it('says it is switched off when it shows nowhere', () => {
    renderWith({ featured: false, featuredDesktop: false }, [CARD]);
    expect(fold().textContent).toContain('выключено на сайте');
    fireEvent.click(fold());
    expect(screen.getByRole('status').textContent).toMatch(/нет на сайте/);
  });

  it('names the one layout it shows on', () => {
    renderWith({ featured: true, featuredDesktop: false });
    expect(fold().textContent).toContain('подбирается автоматически · только на мобильных');
  });

  it('reads saved settings without the flags as phones only', () => {
    renderWith(undefined, [CARD, CARD]);
    expect(fold().textContent).toContain('2 карточки · только на мобильных');
  });

  it('says only the cards when it shows everywhere, with no warning inside', () => {
    renderWith({ featured: true, featuredDesktop: true }, [CARD]);
    expect(fold().textContent).toContain('1 карточка');
    expect(fold().textContent).not.toContain('только');
    fireEvent.click(fold());
    expect(screen.queryByRole('status')).toBeNull();
  });
});
