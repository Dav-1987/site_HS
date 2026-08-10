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

-- Stable browser-generated request id. The partial unique index keeps legacy
-- rows (which have NULL here) valid while making every new order idempotent.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_event_id
  ON orders (event_id) WHERE event_id IS NOT NULL;
