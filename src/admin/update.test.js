import { describe, it, expect } from 'vitest';
import { applyUpdate, updateAt } from './update.js';

const byId = (id) => (p) => p.id === id;
const rename = (name) => (p) => ({ ...p, name });

describe('applyUpdate', () => {
  it('takes a value as it is', () => {
    expect(applyUpdate(2, 1)).toBe(2);
  });

  it('runs a function against the current value', () => {
    expect(applyUpdate((n) => n + 1, 1)).toBe(2);
  });
});

describe('updateAt', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('changes the item at its place when it is still there', () => {
    expect(updateAt(list, 1, byId('b'), rename('B'))).toEqual([
      { id: 'a' },
      { id: 'b', name: 'B' },
      { id: 'c' },
    ]);
  });

  it('follows the item when the list moved under it', () => {
    const moved = [list[1], list[0], list[2]];
    expect(updateAt(moved, 1, byId('b'), rename('B'))).toEqual([
      { id: 'b', name: 'B' },
      { id: 'a' },
      { id: 'c' },
    ]);
  });

  it('follows it past the end of a list that got shorter', () => {
    expect(updateAt([list[2]], 2, byId('c'), rename('C'))).toEqual([{ id: 'c', name: 'C' }]);
  });

  // Losing a photo beats handing it to the product that took the place.
  it('changes nothing when the item is gone', () => {
    const gone = [list[0], list[2]];
    expect(updateAt(gone, 1, byId('b'), rename('B'))).toBe(gone);
  });

  // Mid-rename, a product's id can equal another's for a keystroke. The place
  // is what tells them apart.
  it('keeps two items that share an id apart by their places', () => {
    const clash = [{ id: 'a' }, { id: 'a' }];
    expect(updateAt(clash, 1, byId('a'), rename('second'))).toEqual([
      { id: 'a' },
      { id: 'a', name: 'second' },
    ]);
  });
});
