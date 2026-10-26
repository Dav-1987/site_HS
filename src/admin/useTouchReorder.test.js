import { describe, it, expect } from 'vitest';
import { edgeScrollStep, reorderTarget, rowShift } from './useTouchReorder.js';

// Three rows 60px tall from y=200: middles at 230, 290, 350.
const mids = [230, 290, 350];

describe('reorderTarget', () => {
  it('lands a row lifted from the top below every middle the finger passed', () => {
    expect(reorderTarget(300, mids, 0)).toEqual({ line: 2, toIndex: 1 });
    expect(reorderTarget(400, mids, 0)).toEqual({ line: 3, toIndex: 2 });
  });

  it('lands a row lifted from the bottom above the first middle the finger is above', () => {
    expect(reorderTarget(250, mids, 2)).toEqual({ line: 1, toIndex: 1 });
    expect(reorderTarget(100, mids, 2)).toEqual({ line: 0, toIndex: 0 });
  });

  it('counts the gaps either side of the row itself as no move', () => {
    expect(reorderTarget(280, mids, 1).toIndex).toBe(1);
    expect(reorderTarget(300, mids, 1).toIndex).toBe(1);
  });
});

describe('edgeScrollStep', () => {
  it('scrolls only near the edges, faster the closer the finger', () => {
    expect(edgeScrollStep(400, 800)).toBe(0);
    expect(edgeScrollStep(60, 800)).toBeLessThan(0);
    expect(edgeScrollStep(0, 800)).toBeLessThan(edgeScrollStep(40, 800));
    expect(edgeScrollStep(790, 800)).toBeGreaterThan(edgeScrollStep(745, 800));
    expect(edgeScrollStep(745, 800)).toBeGreaterThan(0);
  });
});

describe('rowShift', () => {
  it('slides the rows between the two places towards the gap the row left', () => {
    // Row 0 held over index 2: rows 1 and 2 move up, row 3 stays.
    expect([0, 1, 2, 3].map((i) => rowShift(i, 0, 2, 60))).toEqual([0, -60, -60, 0]);
    // Row 3 held over index 1: rows 1 and 2 move down.
    expect([0, 1, 2, 3].map((i) => rowShift(i, 3, 1, 60))).toEqual([0, 60, 60, 0]);
    expect([0, 1, 2].map((i) => rowShift(i, 1, 1, 60))).toEqual([0, 0, 0]);
  });
});
