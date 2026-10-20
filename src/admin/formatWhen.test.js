import { describe, expect, it } from 'vitest';
import { formatWhen } from './formatWhen.js';

describe('formatWhen', () => {
  const now = new Date(2026, 9, 20, 15, 0);

  it('says today and yesterday', () => {
    expect(formatWhen(new Date(2026, 9, 20, 12, 40).toISOString(), now)).toBe('сегодня, 12:40');
    expect(formatWhen(new Date(2026, 9, 19, 19, 5).toISOString(), now)).toBe('вчера, 19:05');
  });

  it('gives the day and month this year, the full date before', () => {
    expect(formatWhen(new Date(2026, 9, 18, 13, 15).toISOString(), now)).toBe('18 окт, 13:15');
    expect(formatWhen(new Date(2025, 9, 18, 13, 15).toISOString(), now)).toBe('18.10.2025, 13:15');
  });
});
