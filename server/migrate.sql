-- HS Muebles — полная схема БД для VPS
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
