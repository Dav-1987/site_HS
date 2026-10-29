// The «Guías» articles as /admin edits them — pure operations on the list, like
// catalogOps.js for the catalog. An article in the editor is a draft: `key`
// (stable for the session: "g<id>" once stored, "new-<n>" until then), the
// stored `id`, `revision`, dates, and the editable fields in editableOf's shape.

import { DEFAULT_PRODUCT_LIMIT, GUIDE_TOPICS } from '../data/guides.js';
import { liveCatalog, productFullName } from '../data/catalog.js';

const LANG_TEXT = ['title', 'description', 'answer', 'body', 'coverAlt'];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function langOf(block) {
  const source = block ?? {};
  return {
    ...Object.fromEntries(LANG_TEXT.map((field) => [field, source[field] ?? ''])),
    faq: (source.faq ?? []).map((item) => ({ q: item?.q ?? '', a: item?.a ?? '' })),
    keywords: [...(source.keywords ?? [])],
  };
}

function productsOf(rule) {
  const source = rule ?? {};
  return {
    category: source.category ?? '',
    type: source.type ?? '',
    minWidth: source.minWidth ?? null,
    maxWidth: source.maxWidth ?? null,
    pinned: [...(source.pinned ?? [])],
    limit: source.limit ?? DEFAULT_PRODUCT_LIMIT,
  };
}

/**
 * What the server stores of an article — the fields the editor changes — with
 * every one filled in and in one order, so two versions compare as text: an
 * article saved before a field existed still reads as unchanged.
 */
export function editableOf(guide) {
  return {
    slug: guide?.slug ?? '',
    visibility: guide?.visibility ?? 'off',
    topic: guide?.topic ?? GUIDE_TOPICS[0],
    cover: guide?.cover ?? '',
    products: productsOf(guide?.products),
    es: langOf(guide?.es),
    en: langOf(guide?.en),
  };
}

/** A draft of an article as the API returned it. */
export function draftOf(stored, key = `g${stored.id}`) {
  return {
    key,
    id: stored.id,
    revision: stored.revision,
    publishedAt: stored.publishedAt ?? null,
    updatedAt: stored.updatedAt ?? null,
    ...editableOf(stored),
  };
}

/** Whether a draft differs from what is stored — a new one always does. */
export function isGuideDirty(draft, stored) {
  if (!stored) return true;
  return JSON.stringify(editableOf(draft)) !== JSON.stringify(editableOf(stored));
}

/** The name an article goes by in the admin's messages. */
export function guideName(draft) {
  return draft.es.title || draft.en.title || draft.slug || 'новая статья';
}

/** A blank article, a draft, at the first free "nueva-guia…" address. */
export function newGuide(guides, n) {
  const taken = new Set(guides.map((g) => g.slug));
  let slug = 'nueva-guia';
  for (let i = 2; taken.has(slug); i++) slug = `nueva-guia-${i}`;
  return {
    key: `new-${n}`,
    id: null,
    revision: null,
    publishedAt: null,
    updatedAt: null,
    ...editableOf({ slug }),
  };
}

/** Why `slug` cannot be the address of the article `key`, or '' when it can. */
export function guideSlugError(guides, key, slug) {
  if (!slug) return 'Адрес не может быть пустым.';
  if (!SLUG_RE.test(slug))
    return 'Только строчные латинские буквы, цифры и дефисы между словами, например medidas-tocador.';
  if (guides.some((g) => g.key !== key && g.slug === slug))
    return 'Этот адрес уже у другой статьи.';
  return '';
}

/** The list with the article `key` one place up (dir -1) or down (+1). */
export function moveGuide(guides, key, dir) {
  const i = guides.findIndex((g) => g.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= guides.length) return guides;
  const next = [...guides];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * The models «Ссылка на товар» offers: every one with a page (unlisted ones
 * too — their pages open), with its section for the address.
 */
export function linkableProducts(categories) {
  return liveCatalog(categories).flatMap((c) =>
    c.products.map((p) => ({ id: p.id, slug: c.slug, name: productFullName(p, 'es') || p.id })),
  );
}
