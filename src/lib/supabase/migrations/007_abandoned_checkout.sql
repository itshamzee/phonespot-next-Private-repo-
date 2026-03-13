-- 007_abandoned_checkout.sql
-- Adds abandoned checkout tracking and recovery fields to orders

-- Expand status CHECK to include 'abandoned'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded', 'abandoned'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_token text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_sms_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_recovery_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_recovery_status_check
      CHECK (recovery_status IN ('none', 'email_sent', 'sms_sent', 'both_sent', 'recovered'));
  END IF;
END $$;

-- Unique index on recovery_token (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_recovery_token
  ON orders(recovery_token) WHERE recovery_token IS NOT NULL;
