-- 009_recovery_second_email.sql
-- Adds columns for the 24h second-reminder email and expands the
-- recovery_status enum to include 'second_email_sent'.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at_2 timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_discount_code text;

-- Replace the recovery_status CHECK with one that includes
-- 'second_email_sent' as a valid value.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_recovery_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_recovery_status_check
  CHECK (recovery_status IN (
    'none',
    'email_sent',
    'second_email_sent',
    'sms_sent',
    'both_sent',
    'recovered'
  ));

-- Index for the cron query that finds second-email candidates.
CREATE INDEX IF NOT EXISTS idx_orders_recovery_email_sent_at
  ON orders(recovery_email_sent_at) WHERE recovery_email_sent_at IS NOT NULL;
