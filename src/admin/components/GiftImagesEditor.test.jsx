import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { uploadImage } from '../api.js';
import GiftEditor from './GiftEditor.jsx';
import { applyUpdate } from '../update.js';

vi.mock('../api.js', () => ({ uploadImage: vi.fn() }));

// The editor the way /admin holds it: the product in state, the gift one field
// of it, updated through a functional setState the way ProductEditor does. A
// photo is only "added" once it survives that round trip — which is the step a
// single-photo field used to lose the first one in.
function Harness({ onState }) {
  const [product, setProduct] = useState({
    id: 'Tocador-L-22',
    gift: { mode: 'own', source: 'custom' },
  });
  onState(product);
  return (
    <GiftEditor
      value={product.gift}
      onChange={(next) => setProduct((p) => ({ ...p, gift: applyUpdate(next, p.gift) }))}
      allProducts={[]}
      excludeId={product.id}
      forProduct
    />
  );
}

const file = (name) => new File(['x'], name, { type: 'image/jpeg' });
const pick = (container, ...files) =>
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files } });

describe('GiftImagesEditor — several photos', () => {
  let n;
  beforeEach(() => {
    n = 0;
    uploadImage.mockReset();
    uploadImage.mockImplementation(async () => ({ url: `/uploads/${++n}.jpg` }));
  });

  it('adds photos one after another and keeps every one', async () => {
    let state;
    const { container } = render(<Harness onState={(s) => (state = s)} />);

    pick(container, file('a.jpg'));
    await waitFor(() => expect(state.gift.images).toEqual(['/uploads/1.jpg']));
    pick(container, file('b.jpg'));
    await waitFor(() => expect(state.gift.images).toEqual(['/uploads/1.jpg', '/uploads/2.jpg']));

    // The first stays the cover the inset reads.
    expect(state.gift.image).toBe('/uploads/1.jpg');
  });

  it('takes several files picked at once', async () => {
    let state;
    const { container } = render(<Harness onState={(s) => (state = s)} />);
    pick(container, file('a.jpg'), file('b.jpg'), file('c.jpg'));
    await waitFor(() => expect(state.gift.images).toHaveLength(3));
  });

  it('says a second photo can follow the first', async () => {
    const { container } = render(<Harness onState={() => {}} />);
    expect(screen.getByText('Добавить фото')).toBeTruthy();
    pick(container, file('a.jpg'));
    await waitFor(() => expect(screen.getByText('Ещё фото')).toBeTruthy());
  });
});
