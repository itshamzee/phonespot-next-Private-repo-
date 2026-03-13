-- 005_orders_upgrade.sql
-- Adds payment_status, fulfillment_status, and tracking fields to orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'returned'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id text;

-- Expand type CHECK to include 'draft' and 'shopify'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('online', 'pos', 'draft', 'shopify'));

-- Backfill payment_status for existing orders
UPDATE orders SET payment_status = 'paid' WHERE status IN ('confirmed', 'shipped', 'picked_up', 'delivered') AND payment_status = 'pending';
UPDATE orders SET payment_status = 'refunded' WHERE status = 'refunded' AND payment_status = 'pending';

-- Backfill fulfillment_status for existing orders
UPDATE orders SET fulfillment_status = 'shipped' WHERE status = 'shipped' AND fulfillment_status = 'unfulfilled';
UPDATE orders SET fulfillment_status = 'delivered' WHERE status IN ('delivered', 'picked_up') AND fulfillment_status = 'unfulfilled';
