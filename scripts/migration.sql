-- ============================================================
-- Auction pipeline migration
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Add new columns to whiskies ──────────────────────────
ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS bottle_fingerprint TEXT;
ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS canonical_name TEXT;
ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS size_ml INTEGER;
ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS cask_finish TEXT;
ALTER TABLE whiskies ADD COLUMN IF NOT EXISTS image_urls JSONB;

-- ── 2. Unique index on bottle_fingerprint ────────────────────
-- Only on non-null values so existing rows without fingerprints coexist safely.
CREATE UNIQUE INDEX IF NOT EXISTS idx_whiskies_bottle_fingerprint_unique
  ON whiskies (bottle_fingerprint)
  WHERE bottle_fingerprint IS NOT NULL;

-- ── 3. auction_sales table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_sales (
  id               BIGSERIAL PRIMARY KEY,
  source           TEXT NOT NULL DEFAULT 'whiskyauctioneer',
  lot_url          TEXT NOT NULL,
  auction_house    TEXT,
  sale_title       TEXT,
  sale_date        TIMESTAMPTZ,
  lot_number       TEXT,
  currency         TEXT NOT NULL DEFAULT 'GBP',
  hammer_price     NUMERIC(10,2),
  sold_price_all_in NUMERIC(10,2),
  result_status    TEXT NOT NULL DEFAULT 'unknown',
  bottle_id        INTEGER REFERENCES whiskies(id) ON DELETE SET NULL,
  raw              JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_sales_source_lot
  ON auction_sales (source, lot_url);

CREATE INDEX IF NOT EXISTS idx_auction_sales_bottle_date
  ON auction_sales (bottle_id, sale_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_auction_sales_hammer
  ON auction_sales (hammer_price)
  WHERE result_status = 'sold';

-- ── 4. RLS — anon key can read auction_sales ─────────────────
ALTER TABLE auction_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read ON auction_sales;
CREATE POLICY anon_read ON auction_sales
  FOR SELECT TO anon USING (true);

-- ── 5. updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_auction_sales_updated_at ON auction_sales;
CREATE TRIGGER trg_auction_sales_updated_at
  BEFORE UPDATE ON auction_sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
