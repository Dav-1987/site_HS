import { describe, expect, it, vi } from 'vitest';
import {
  addProduct,
  categorySlugError,
  copyOfCategory,
  copyOfProduct,
  insertProductAfter,
  locateProduct,
  moveCategory,
  moveProduct,
  moveProductsTo,
  newCategory,
  newProduct,
  productIdError,
  removeCategory,
  removeProduct,
  removeProducts,
  renameCategory,
  renameProduct,
  updateCategory,
  updateProduct,
  updateProducts,
} from './catalogOps.js';

const p = (id, extra = {}) => ({ id, name: id, ...extra });
const catalog = () => [
  { slug: 'tocadores', products: [p('A'), p('B'), p('C')] },
  { slug: 'espejos', products: [p('D')] },
];
const ids = (cats) => cats.map((c) => `${c.slug}:${c.products.map((x) => x.id).join(',')}`);

describe('updateProduct', () => {
  it('finds the product by id in whichever category it is', () => {
    const next = updateProduct(catalog(), 'D', (x) => ({ ...x, name: 'Espejo' }));
    expect(next[1].products[0].name).toBe('Espejo');
  });

  it('leaves the catalog as it was when the product is gone', () => {
    const cats = catalog();
    expect(updateProduct(cats, 'gone', { id: 'gone' })).toBe(cats);
  });

  it('lands on the product even after it moved and the list reordered', () => {
    let cats = moveProductsTo(catalog(), ['A'], 'espejos');
    cats = moveProduct(cats, 'B', 1);
    cats = updateProduct(cats, 'A', (x) => ({ ...x, imageMobile: '/uploads/a.jpg' }));
    expect(cats[1].products.find((x) => x.id === 'A').imageMobile).toBe('/uploads/a.jpg');
    expect(cats[0].products.every((x) => !x.imageMobile)).toBe(true);
  });
});

describe('updateCategory', () => {
  it('merges into the category with that slug', () => {
    const next = updateCategory(catalog(), 'espejos', (c) => ({ ...c, image: '/x.jpg' }));
    expect(next[1].image).toBe('/x.jpg');
    expect(next[1].products).toHaveLength(1);
  });
});

describe('adding, copying and removing products', () => {
  it('appends a new product to its category', () => {
    const product = newProduct('espejos');
    expect(product.id).toMatch(/^espejos-/);
    expect(ids(addProduct(catalog(), 'espejos', product))[1]).toBe(`espejos:D,${product.id}`);
  });

  it('gives every new product an id of its own, even within one millisecond', () => {
    // The same time and the same "random" characters for all of them: only the
    // counter can tell them apart, so the test no longer depends on luck.
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_792_559_232_233);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.123456);
    try {
      const many = Array.from({ length: 50 }, () => newProduct('x').id);
      const copies = Array.from({ length: 50 }, () => copyOfProduct(p('B')).id);
      expect(new Set(many).size).toBe(50);
      expect(new Set(copies).size).toBe(50);
    } finally {
      now.mockRestore();
      random.mockRestore();
    }
  });

  it('puts a copy right after the original', () => {
    const copy = copyOfProduct(p('B'));
    expect(copy.id).toMatch(/^B-copy-/);
    expect(ids(insertProductAfter(catalog(), 'B', copy))[0]).toBe(`tocadores:A,B,${copy.id},C`);
  });

  it('removes by id', () => {
    expect(ids(removeProduct(catalog(), 'B'))[0]).toBe('tocadores:A,C');
  });
});

describe('moveProduct', () => {
  it('moves within the category, clamped to its ends', () => {
    expect(ids(moveProduct(catalog(), 'C', 0))[0]).toBe('tocadores:C,A,B');
    expect(ids(moveProduct(catalog(), 'A', 99))[0]).toBe('tocadores:B,C,A');
  });
});

describe('moveProductsTo', () => {
  it('moves products from any category to the end of another, in catalog order', () => {
    const next = moveProductsTo(catalog(), ['D', 'A', 'C'], 'espejos');
    expect(ids(next)).toEqual(['tocadores:B', 'espejos:D,A,C']);
  });

  it('does nothing for a category that does not exist', () => {
    const cats = catalog();
    expect(moveProductsTo(cats, ['A'], 'nope')).toBe(cats);
  });
});

describe('updateProducts', () => {
  it('applies a patch or an updater to every listed product, in any category', () => {
    const next = updateProducts(catalog(), ['A', 'D'], (x) => ({ ...x, visibility: 'off' }));
    expect(next.flatMap((c) => c.products.map((x) => `${x.id}:${x.visibility ?? '-'}`))).toEqual([
      'A:off',
      'B:-',
      'C:-',
      'D:off',
    ]);
  });

  it('hands back a category without any of them as it was', () => {
    const cats = catalog();
    const next = updateProducts(cats, ['D'], { inStock: false });
    expect(next[0]).toBe(cats[0]);
    expect(next[1].products[0].inStock).toBe(false);
  });

  it('hands back the same catalog for an empty or unknown selection', () => {
    const cats = catalog();
    expect(updateProducts(cats, [], { inStock: false })).toBe(cats);
    expect(ids(updateProducts(cats, ['ghost'], { inStock: false }))).toEqual(ids(cats));
  });
});

describe('removeProducts', () => {
  it('removes every listed product from whichever category it is in', () => {
    expect(ids(removeProducts(catalog(), ['A', 'C', 'D']))).toEqual(['tocadores:B', 'espejos:']);
  });

  it('leaves the rest alone', () => {
    const cats = catalog();
    const next = removeProducts(cats, ['D']);
    expect(next[0]).toBe(cats[0]);
    expect(removeProducts(cats, [])).toBe(cats);
  });
});

describe('renameProduct', () => {
  const linked = () => [
    {
      slug: 'tocadores',
      gift: { source: 'catalog', productId: 'B' },
      products: [p('A', { related: ['B', 'C'] }), p('B'), p('C', { gift: { productId: 'B' } })],
    },
  ];

  it('renames the product and every pick and gift that points at it', () => {
    const [cat] = renameProduct(linked(), 'B', 'Tocador-L-24');
    expect(cat.products.map((x) => x.id)).toEqual(['A', 'Tocador-L-24', 'C']);
    expect(cat.products[0].related).toEqual(['Tocador-L-24', 'C']);
    expect(cat.products[2].gift.productId).toBe('Tocador-L-24');
    expect(cat.gift.productId).toBe('Tocador-L-24');
  });

  it('refuses an id another product has, or an empty one', () => {
    const cats = linked();
    expect(productIdError(cats, 'B', 'C')).toBe('Такой ID уже есть у другого товара');
    expect(productIdError(cats, 'B', '')).toBe('ID не может быть пустым');
    expect(productIdError(cats, 'B', 'B')).toBe('');
    expect(renameProduct(cats, 'B', 'C')).toBe(cats);
  });
});

describe('categories', () => {
  it('refuses a reserved, taken or empty address', () => {
    const cats = catalog();
    expect(categorySlugError(cats, 'espejos', 'contacto')).toMatch(/системной/);
    expect(categorySlugError(cats, 'espejos', 'opiniones')).toMatch(/системной/);
    expect(categorySlugError(cats, 'espejos', 'tocadores')).toMatch(/другой категории/);
    expect(categorySlugError(cats, 'espejos', '')).toMatch(/пустым/);
    expect(categorySlugError(cats, 'espejos', 'espejos-led')).toBe('');
  });

  it('renames a category only to a free address', () => {
    expect(renameCategory(catalog(), 'espejos', 'espejos-led')[1].slug).toBe('espejos-led');
    const cats = catalog();
    expect(renameCategory(cats, 'espejos', 'tocadores')).toBe(cats);
  });

  it('gives a new category an address no other category has', () => {
    const cats = [...catalog(), { slug: 'nueva-categoria-3', products: [] }];
    expect(newCategory(cats).slug).toBe('nueva-categoria-4');
  });

  it('copies a category with new addresses for it and its products', () => {
    const copy = copyOfCategory(catalog()[0]);
    expect(copy.slug).toMatch(/^tocadores-copy-/);
    expect(copy.products.every((x) => x.id.includes('-copy-'))).toBe(true);
  });

  it('moves and removes by slug', () => {
    expect(ids(moveCategory(catalog(), 'espejos', -1))[0]).toBe('espejos:D');
    const cats = catalog();
    expect(moveCategory(cats, 'espejos', 1)).toBe(cats);
    expect(ids(removeCategory(catalog(), 'tocadores'))).toEqual(['espejos:D']);
  });

  it('locates a product as category and position', () => {
    expect(locateProduct(catalog(), 'C')).toEqual({ ci: 0, pi: 2 });
    expect(locateProduct(catalog(), 'Z')).toBeNull();
  });
});
