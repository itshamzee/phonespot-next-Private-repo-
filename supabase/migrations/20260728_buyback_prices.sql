-- Fallback base prices for buyback. Used ONLY when we have no refurbished sale
-- price of our own for the model (no listed device, no template base_price_a).
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  brand       text NOT NULL,
  model       text NOT NULL,
  storage     text,
  ram         text,
  base_price  integer NOT NULL,           -- ØRE, device in perfect condition
  active      boolean NOT NULL DEFAULT true,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_prices_variant
  ON buyback_prices (
    lower(trim(device_type)),
    lower(trim(brand)),
    lower(trim(model)),
    lower(trim(coalesce(storage, ''))),
    lower(trim(coalesce(ram, '')))
  );

CREATE INDEX IF NOT EXISTS idx_buyback_prices_lookup
  ON buyback_prices (lower(trim(brand)), lower(trim(model)))
  WHERE active;
