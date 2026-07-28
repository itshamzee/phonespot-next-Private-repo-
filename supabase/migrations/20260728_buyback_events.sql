-- Append-only log of everything the buyback system does. Feeds the admin live
-- feed, the SMS alerts and the daily operations email.
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
  offer_id   uuid REFERENCES trade_in_offers(id) ON DELETE SET NULL,
  type       text NOT NULL,
  severity   text NOT NULL DEFAULT 'info',
  summary    text NOT NULL,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_events_created_at
  ON buyback_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_inquiry
  ON buyback_events (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_severity
  ON buyback_events (severity, created_at DESC)
  WHERE severity <> 'info';

-- The admin live feed subscribes to inserts.
ALTER PUBLICATION supabase_realtime ADD TABLE buyback_events;
