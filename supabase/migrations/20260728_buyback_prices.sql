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

-- Restricted to staff, NOT to `authenticated`. B2B wholesale customers hold real
-- Supabase accounts and several are resellers; this table IS our buying strategy,
-- and a `TO authenticated` policy would also have let them rewrite it. The engine
-- reads it with the service role, which bypasses RLS.
ALTER TABLE public.buyback_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_prices;
DROP POLICY IF EXISTS "Staff can manage buyback prices" ON public.buyback_prices;
CREATE POLICY "Staff can manage buyback prices" ON public.buyback_prices
  FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());
