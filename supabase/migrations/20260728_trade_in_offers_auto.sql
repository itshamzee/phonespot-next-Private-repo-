-- Automation columns on trade_in_offers. Hand-applied in the SQL editor.

ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS auto_sent         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_email_id   text,
  ADD COLUMN IF NOT EXISTS send_state        text NOT NULL DEFAULT 'sent';

-- Every existing row was sent by hand at creation time.
UPDATE trade_in_offers SET send_state = 'sent' WHERE send_state IS NULL;

-- Finding the offers still inside their hold window.
CREATE INDEX IF NOT EXISTS idx_trade_in_offers_scheduled
  ON trade_in_offers (scheduled_send_at)
  WHERE send_state = 'scheduled';
