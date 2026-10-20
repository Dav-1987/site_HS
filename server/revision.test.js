import { describe, expect, it } from 'vitest';
import { createQueue, isStale, revisionOf } from './revision.js';

describe('revisionOf', () => {
  it('is the same for the same data', () => {
    expect(revisionOf({ a: [1, 2] })).toBe(revisionOf({ a: [1, 2] }));
  });

  it('changes with any change to the data', () => {
    expect(revisionOf([{ price: 249 }])).not.toBe(revisionOf([{ price: 250 }]));
  });

  it('is a short string, cheap to send back and forth', () => {
    expect(revisionOf([])).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('isStale', () => {
  it('lets a save through when it names the current revision', () => {
    expect(isStale('abc', 'abc')).toBe(false);
  });

  it('turns a save away when the data changed since it was loaded', () => {
    expect(isStale('abc', 'def')).toBe(true);
  });

  it('does not check a save that names no revision', () => {
    expect(isStale(undefined, 'def')).toBe(false);
    expect(isStale(null, 'def')).toBe(false);
    expect(isStale(42, 'def')).toBe(false);
  });
});

describe('createQueue', () => {
  it('runs jobs one after another, never interleaved', async () => {
    const queue = createQueue();
    const log = [];
    const job = (name, ms) => async () => {
      log.push(`${name} start`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`${name} end`);
    };
    await Promise.all([queue(job('a', 20)), queue(job('b', 0))]);
    expect(log).toEqual(['a start', 'a end', 'b start', 'b end']);
  });

  it('hands each caller its own result or error', async () => {
    const queue = createQueue();
    await expect(queue(async () => 1)).resolves.toBe(1);
    await expect(queue(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });

  it('keeps going after a job fails', async () => {
    const queue = createQueue();
    const failed = queue(async () => {
      throw new Error('boom');
    });
    const next = queue(async () => 'ok');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
