-- Buyback pricing engine reads foneday_catalog filtered by model_codes (array
-- contains) + in_stock, and matches category/quality in JS. These indexes keep
-- the per-fault lookups fast as the catalog grows.
-- Hand-applied (no migration runner): run in the Supabase SQL editor.

CREATE INDEX IF NOT EXISTS idx_foneday_catalog_model_codes
  ON foneday_catalog USING GIN (model_codes);

CREATE INDEX IF NOT EXISTS idx_foneday_catalog_in_stock
  ON foneday_catalog (in_stock);
