-- phonespot-next/supabase/migrations/20260526_battery_upgrade_flag.sql

-- Add a boolean flag on order_items to mark devices that were sold with the
-- +300 kr "new 100% battery" upgrade. The webhook handler writes it; the
-- admin order view and packing slip read it.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS battery_upgrade BOOLEAN NOT NULL DEFAULT FALSE;

-- Convenience: index for any future "find orders needing battery swap" report.
CREATE INDEX IF NOT EXISTS idx_order_items_battery_upgrade
  ON order_items(battery_upgrade)
  WHERE battery_upgrade = TRUE;

COMMENT ON COLUMN order_items.battery_upgrade IS
  'TRUE when the customer paid +300 kr for a new 100%% battery installation. Drives the admin packing-slip stamp.';
