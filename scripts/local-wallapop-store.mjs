import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const WALLAPOP_STATE_VERSION = 1;
export const WALLAPOP_STATE_PATH = 'local-data/wallapop-panel.json';

const API_PATH = '/__local/wallapop-state';
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const VALID_STATUSES = new Set(['not_published', 'published', 'sold']);

function emptyState() {
  return { version: WALLAPOP_STATE_VERSION, updatedAt: null, products: {} };
}

function cleanString(value, maxLength = 20_000) {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function cleanStringArray(value, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, maxItems)
    .map((item) => item.slice(0, 2_000));
}

function cleanRecord(id, value) {
  const record = value && typeof value === 'object' ? value : {};
  return {
    productId: id,
    reference: cleanString(record.reference, 200),
    siteCategorySlug: cleanString(record.siteCategorySlug, 200),
    siteCategoryName: cleanString(record.siteCategoryName, 500),
    wallapopCategory: cleanString(record.wallapopCategory, 500),
    wallapopSection: cleanString(record.wallapopSection, 500),
    wallapopType: cleanString(record.wallapopType, 500),
    titleEs: cleanString(record.titleEs, 500),
    descriptionEs: cleanString(record.descriptionEs),
    price: Number.isFinite(Number(record.price)) ? Number(record.price) : 0,
    size: cleanString(record.size, 500),
    photos: cleanStringArray(record.photos),
    status: VALID_STATUSES.has(record.status) ? record.status : 'not_published',
    notes: cleanString(record.notes, 5_000),
    sourceUpdatedAt: cleanString(record.sourceUpdatedAt, 100),
    importedAt: cleanString(record.importedAt, 100),
    updatedAt: cleanString(record.updatedAt, 100),
  };
}

export function normalizeWallapopState(value) {
  const input = value && typeof value === 'object' ? value : {};
  const products = {};
  if (input.products && typeof input.products === 'object' && !Array.isArray(input.products)) {
    for (const [rawId, record] of Object.entries(input.products)) {
      const id = cleanString(rawId, 300).trim();
      if (id) products[id] = cleanRecord(id, record);
    }
  }
  return {
    version: WALLAPOP_STATE_VERSION,
    updatedAt: cleanString(input.updatedAt, 100) || null,
    products,
  };
}

export async function readWallapopState(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return normalizeWallapopState(JSON.parse(raw));
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyState();
    throw error;
  }
}

export async function writeWallapopState(filePath, value) {
  const state = normalizeWallapopState(value);
  state.updatedAt = new Date().toISOString();
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
  return state;
}

function sendJson(res, statusCode, value) {
  const body = JSON.stringify(value);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

export function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

async function readJsonBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function localWallapopStore({ statePath = WALLAPOP_STATE_PATH } = {}) {
  return {
    name: 'local-wallapop-store',
    apply: 'serve',
    configureServer(server) {
      const filePath = resolve(server.config.root, statePath);
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== API_PATH) return next();

        if (!isLoopbackAddress(req.socket?.remoteAddress)) {
          sendJson(res, 403, { error: 'Local access only' });
          return;
        }

        try {
          if (req.method === 'GET') {
            sendJson(res, 200, await readWallapopState(filePath));
            return;
          }
          if (req.method === 'PUT') {
            sendJson(res, 200, await writeWallapopState(filePath, await readJsonBody(req)));
            return;
          }
          res.setHeader('Allow', 'GET, PUT');
          sendJson(res, 405, { error: 'Method not allowed' });
        } catch (error) {
          console.error('[wallapop-store]', error);
          sendJson(res, error?.statusCode ?? 500, {
            error: error instanceof SyntaxError ? 'Invalid JSON' : 'Could not save local state',
          });
        }
      });
    },
  };
}
