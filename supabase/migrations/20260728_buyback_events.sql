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

-- Restricted to staff, NOT to `authenticated`. B2B wholesale customers hold real
-- Supabase accounts (b2b_customers.auth_id + /api/b2b/login), and several of them
-- are resellers — a `TO authenticated` policy would hand them every offer we have
-- made, with customer names and amounts. Writes come from the service role, which
-- bypasses RLS entirely; staff only ever read.
ALTER TABLE public.buyback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.buyback_events;
DROP POLICY IF EXISTS "Staff can read buyback events" ON public.buyback_events;
CREATE POLICY "Staff can read buyback events" ON public.buyback_events
  FOR SELECT TO authenticated USING (is_staff());
