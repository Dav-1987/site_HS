import { describe, it, expect } from 'vitest';
import { findStrayUploads, isOriginalUpload, STRAY_GRACE_MS } from './uploads-cleanup.js';

const NOW = Date.parse('2026-09-05T12:00:00Z');
const old = (name) => ({ name, mtimeMs: NOW - STRAY_GRACE_MS - 1000 });
const fresh = (name) => ({ name, mtimeMs: NOW - 60_000 });

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const C = 'c'.repeat(32);

const stray = (entries, active = []) => findStrayUploads(entries, new Set(active), { now: NOW });

describe('isOriginalUpload', () => {
  it('accepts a content-hashed upload', () => {
    expect(isOriginalUpload(`${A}.jpg`)).toBe(true);
    expect(isOriginalUpload(`${A}.mp4`)).toBe(true);
    expect(isOriginalUpload(`${A}.webp`)).toBe(true);
  });

  it('rejects the sizes generated from one', () => {
    expect(isOriginalUpload(`${A}_400.webp`)).toBe(false);
    expect(isOriginalUpload(`${A}_800.webp`)).toBe(false);
    expect(isOriginalUpload(`${A}_1600.webp`)).toBe(false);
  });

  it('rejects a video poster and its sizes', () => {
    expect(isOriginalUpload(`${A}_poster.jpg`)).toBe(false);
    expect(isOriginalUpload(`${A}_poster_800.webp`)).toBe(false);
  });

  it('rejects anything not named like an upload', () => {
    expect(isOriginalUpload('tmp-1757000000000-k3j4h')).toBe(false);
    expect(isOriginalUpload('.gitkeep')).toBe(false);
    expect(isOriginalUpload('logo.png')).toBe(false);
    expect(isOriginalUpload(`${A}`)).toBe(false); // no extension
    expect(isOriginalUpload(`${'a'.repeat(31)}.jpg`)).toBe(false); // too short
    expect(isOriginalUpload(`${'z'.repeat(32)}.jpg`)).toBe(false); // not hex
  });
});

describe('findStrayUploads', () => {
  it('returns an old original nothing references', () => {
    expect(stray([old(`${A}.jpg`)])).toEqual([`${A}.jpg`]);
  });

  it('leaves a referenced original alone however old it is', () => {
    expect(stray([old(`${A}.jpg`)], [`${A}.jpg`])).toEqual([]);
  });

  it('leaves a fresh upload alone — it may be mid-upload or mid-edit', () => {
    expect(stray([fresh(`${A}.jpg`)])).toEqual([]);
  });

  it('takes a file the moment it passes the grace period', () => {
    const exactly = { name: `${A}.jpg`, mtimeMs: NOW - STRAY_GRACE_MS };
    expect(stray([exactly])).toEqual([`${A}.jpg`]);
    const justUnder = { name: `${A}.jpg`, mtimeMs: NOW - STRAY_GRACE_MS + 1 };
    expect(stray([justUnder])).toEqual([]);
  });

  it('never returns derived files — they go with their original', () => {
    const entries = [old(`${A}_400.webp`), old(`${A}_800.webp`), old(`${A}_poster.jpg`)];
    expect(stray(entries)).toEqual([]);
  });

  it('returns an unreferenced video, which also has no webp sizes', () => {
    expect(stray([old(`${B}.mp4`)])).toEqual([`${B}.mp4`]);
  });

  it('ignores files that were never uploads', () => {
    expect(stray([old('tmp-123-abc'), old('.gitkeep'), old('notes.txt')])).toEqual([]);
  });

  it('sorts the real world out in one pass', () => {
    const entries = [
      old(`${A}.jpg`), // referenced → keep
      old(`${A}_400.webp`), // derived → keep
      old(`${B}.jpg`), // stray → delete
      old(`${B}_800.webp`), // derived from a stray, still not listed itself
      fresh(`${C}.jpg`), // too new → keep
      old('tmp-1757000000000-abc'), // not an upload → keep
    ];
    expect(stray(entries, [`${A}.jpg`])).toEqual([`${B}.jpg`]);
  });

  it('respects a caller-supplied grace period', () => {
    const hourOld = { name: `${A}.jpg`, mtimeMs: NOW - 60 * 60 * 1000 };
    expect(findStrayUploads([hourOld], new Set(), { now: NOW, graceMs: 30 * 60 * 1000 })).toEqual([
      `${A}.jpg`,
    ]);
  });
});
