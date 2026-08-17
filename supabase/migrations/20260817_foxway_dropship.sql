-- 20260817_foxway_dropship.sql
-- Dropship-overblik: bestillingsstatus på ordrer + leverandør-URL på devices.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS foxway_status TEXT
  CHECK (foxway_status IN ('pending', 'ordered'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS foxway_order_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_foxway_status
  ON orders(foxway_status) WHERE foxway_status IS NOT NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS source_url TEXT;
