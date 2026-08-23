-- Mirage Muebles — полная схема БД для VPS
-- Запускать: psql -U hs_user -d hs_muebles -f migrate.sql

-- Категории
CREATE TABLE IF NOT EXISTS categories (
  slug            TEXT PRIMARY KEY,
  name_es         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  tagline_es      TEXT NOT NULL DEFAULT '',
  tagline_en      TEXT NOT NULL DEFAULT '',
  description_es  TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',
  image           TEXT NOT NULL DEFAULT '',
  image_mobile    TEXT NOT NULL DEFAULT '',
  video           TEXT NOT NULL DEFAULT '',
  position        INTEGER NOT NULL DEFAULT 0
);

-- Товары
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  category_slug  TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  price          INTEGER NOT NULL DEFAULT 0,
  old_price      INTEGER NOT NULL DEFAULT 0,
  image          TEXT NOT NULL DEFAULT '',
  image_mobile   TEXT NOT NULL DEFAULT '',
  images         JSONB NOT NULL DEFAULT '[]'::jsonb,
  video          TEXT NOT NULL DEFAULT '',
  description_es TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  related        JSONB NOT NULL DEFAULT '[]'::jsonb,
  material_es    TEXT NOT NULL DEFAULT '',
  material_en    TEXT NOT NULL DEFAULT '',
  size           TEXT NOT NULL DEFAULT '',
  reference      TEXT NOT NULL DEFAULT '',
  subtitle       TEXT NOT NULL DEFAULT '',
  position       INTEGER NOT NULL DEFAULT 0
);

-- Idempotent for existing installs: CREATE TABLE IF NOT EXISTS above won't add
-- columns to a table that already exists, so add them explicitly here too.
ALTER TABLE products ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_first BOOLEAN NOT NULL DEFAULT false;
-- Unified ordered media list (photos + videos): [{ "type": "image"|"video", "src": "..." }]
ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Variant of the 3-icon "order perks" strip under the order button: names the
-- third perk ('bulbs' | 'led' | 'quality'); the first two are the same for every
-- product. See PERK_VARIANTS in src/data/catalog.js.
ALTER TABLE products ADD COLUMN IF NOT EXISTS perks TEXT NOT NULL DEFAULT 'bulbs';
-- Default switched to 'quality' after the column already existed. Kept as a
-- separate statement so installs created with the old default converge too;
-- it only affects future inserts and rewrites no existing row.
ALTER TABLE products ALTER COLUMN perks SET DEFAULT 'quality';
-- Real per-row last-modified time, for accurate sitemap <lastmod> (see store.js
-- writeCatalog: only bumped when the row's content actually changed, since the
-- editor always re-saves the whole catalog via DELETE+INSERT).
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_slug);

-- История версий каталога
CREATE TABLE IF NOT EXISTS catalog_versions (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data       JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_versions_created ON catalog_versions (created_at DESC);

-- Настройки сайта (hero image, featured products, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Заявки из корзины (POST /api/order). Telegram/email — лучшая попытка
-- уведомления, эта таблица — единственная надёжная история заявок.
CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  comment        TEXT NOT NULL DEFAULT '',
  product_id     TEXT NOT NULL DEFAULT '',
  product_name   TEXT NOT NULL DEFAULT '',
  telegram_sent  BOOLEAN NOT NULL DEFAULT false,
  email_sent     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

-- Actual (non-struck-through) price at the moment of the order request.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price INTEGER;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';

-- Required on the form since 2026-08; legacy rows keep the empty default.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code TEXT NOT NULL DEFAULT '';

-- Where the visitor came from (click ids, utm parameters, referrer), captured
-- on the landing page. Stored raw so the human-readable label stays derived
-- (server/attribution.js) and can be improved for past orders too.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attribution JSONB;

-- Stable browser-generated request id. The partial unique index keeps legacy
-- rows (which have NULL here) valid while making every new order idempotent.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_event_id
  ON orders (event_id) WHERE event_id IS NOT NULL;

-- ─── Visibility ──────────────────────────────────────────────────────────────
-- Three states, admin-editable (see VISIBILITY in src/data/catalog.js):
--   'public'   — listed everywhere (default)
--   'unlisted' — no links to it anywhere on the site, but the page still works
--                and stays in the sitemap/index
--   'off'      — page 404s, dropped from the sitemap and the prerender
-- A category set to 'off' cascades to its products' pages.
--
-- The backfill sits inside the "column did not exist" branch so it runs exactly
-- once: "Otros Modelos" used to be hidden by a hardcoded slug list in
-- src/data/catalog.js, and this is the migration of that state into data. An
-- unconditional UPDATE here would silently re-hide it after every deploy.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'categories' AND column_name = 'visibility') THEN
    ALTER TABLE categories ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
    UPDATE categories SET visibility = 'unlisted' WHERE slug = 'otros-modelos';
  END IF;
END $$;

ALTER TABLE products ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

-- Per-product switch for the "-N%" sale badge in the corner of the photo
-- (see showsDiscountBadge in src/data/catalog.js). Positive and on by default:
-- the badge has always been shown whenever a higher old price is set, and this
-- only adds a way to keep the struck-through old price while leaving the photo
-- itself clean. NULL/absent reads as true everywhere.
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_discount_badge BOOLEAN NOT NULL DEFAULT true;

-- Whether the product can be ordered right now. Deliberately NOT a visibility
-- state: an out-of-stock product keeps its place in every listing, its page and
-- the sitemap — only the corner badge, the order button and the Offer's
-- availability change. On by default, so every existing row (and any row
-- written before the column) stays orderable.
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN NOT NULL DEFAULT true;
