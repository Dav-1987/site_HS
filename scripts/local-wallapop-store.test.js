// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isLoopbackAddress,
  normalizeWallapopState,
  readWallapopState,
  writeWallapopState,
} from './local-wallapop-store.mjs';

let temporaryDirectory;

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = null;
});

describe('local Wallapop file store', () => {
  it('accepts only loopback clients', () => {
    expect(isLoopbackAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::1')).toBe(true);
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('192.168.1.15')).toBe(false);
  });

  it('normalizes records and rejects unknown statuses', () => {
    const state = normalizeWallapopState({
      products: {
        'product-1': { productId: 'wrong-id', status: 'unknown', notes: 42, price: '399' },
      },
    });

    expect(state.products['product-1']).toMatchObject({
      productId: 'product-1',
      status: 'not_published',
      notes: '',
      price: 399,
    });
  });

  it('writes and reads the durable JSON file repeatedly', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'hs-wallapop-store-'));
    const filePath = join(temporaryDirectory, 'nested', 'state.json');
    const first = await writeWallapopState(filePath, {
      products: { A: { status: 'published', notes: 'Primera versión' } },
    });
    expect(first.products.A.status).toBe('published');

    await writeWallapopState(filePath, {
      products: { A: { status: 'sold', notes: 'Segunda versión' } },
    });
    const saved = await readWallapopState(filePath);
    const raw = await readFile(filePath, 'utf8');

    expect(saved.products.A.status).toBe('sold');
    expect(saved.products.A.notes).toBe('Segunda versión');
    expect(JSON.parse(raw).version).toBe(1);
  });
});
