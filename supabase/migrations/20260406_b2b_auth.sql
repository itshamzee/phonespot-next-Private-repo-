-- B2B Auth & Pricing Extensions

-- 1. Add auth_id to b2b_customers for direct login
ALTER TABLE b2b_customers
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS price_group TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_b2b_customers_auth_id ON b2b_customers(auth_id);
CREATE INDEX IF NOT EXISTS idx_b2b_customers_approved ON b2b_customers(approved);

-- 2. Add B2B wholesale price to sku_products
ALTER TABLE sku_products
  ADD COLUMN IF NOT EXISTS b2b_price INTEGER;  -- wholesale price in øre, NULL = use selling_price

CREATE INDEX IF NOT EXISTS idx_sku_products_b2b_price ON sku_products(b2b_price);
