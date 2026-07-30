import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductEditor from './ProductEditor.jsx';
import { DEFAULT_PERK_VARIANT, PERK_VARIANTS } from '../../data/catalog.js';

const noop = () => {};

// A product whose gallery deliberately starts with a video: the collapsed row
// must show the first PHOTO, matching the catalog cover rule.
const product = {
  id: 'Tocador-M-05',
  name: 'Tocador',
  subtitle: '90 × 40 × 170 cm',
  reference: 'M-05',
  price: 489,
  media: [
    { type: 'video', src: '/uploads/clip.mp4' },
    { type: 'image', src: '/uploads/cover.jpg' },
    { type: 'image', src: '/uploads/second.jpg' },
  ],
  material: { es: '', en: '' },
  description: { es: '', en: '' },
};

function renderEditor(p = product, onChange = noop) {
  return render(
    <ProductEditor
      product={p}
      onChange={onChange}
      onRemove={noop}
      onMove={noop}
      onDuplicate={noop}
      isFirst={false}
      isLast={false}
      allProducts={[]}
    />,
  );
}

const expand = () => fireEvent.click(screen.getByRole('button', { name: /Tocador/ }));

describe('ProductEditor — collapsed row thumbnail', () => {
  it('shows the cover photo, skipping a leading video', () => {
    const { container } = renderEditor();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // resolveImage(src, 200) → nearest pre-generated WebP size.
    expect(img.getAttribute('src')).toBe('/uploads/cover_400.webp');
  });

  it('lazy-loads the thumbnail (a category can hold ~100 rows)', () => {
    const { container } = renderEditor();
    expect(container.querySelector('img').getAttribute('loading')).toBe('lazy');
  });

  it('falls back to the placeholder when the product has no photo', () => {
    const { container } = renderEditor({ ...product, media: [{ type: 'video', src: '/uploads/clip.mp4' }] });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('HS')).toBeTruthy();
  });
});

describe('ProductEditor — order perks variant', () => {
  it('defaults to the original variant for a product that never set one', () => {
    renderEditor();
    expand();
    expect(screen.getByLabelText('Третий пункт').value).toBe(DEFAULT_PERK_VARIANT);
  });

  it('offers every variant', () => {
    renderEditor();
    expand();
    const values = [...screen.getByLabelText('Третий пункт').options].map((o) => o.value);
    expect(values).toEqual(PERK_VARIANTS);
  });

  it('reports the chosen variant on the product', () => {
    const onChange = vi.fn();
    renderEditor(product, onChange);
    expand();
    fireEvent.change(screen.getByLabelText('Третий пункт'), { target: { value: 'quality' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ perks: 'quality' }));
  });
});
