-- Admin-side declines for buyback leads. Kept out of contact_inquiries so the
-- shared inquiries table does not grow buyback-specific columns.
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_declines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  note        text,
  email_sent  boolean NOT NULL DEFAULT false,
  declined_at timestamptz NOT NULL DEFAULT now(),
  declined_by text
);

-- A lead is declined once. The unique index is what makes the route idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_declines_inquiry
  ON buyback_declines (inquiry_id);

-- Staff only: a decline names the customer and why we said no. Writes come from
-- the service role via /api/trade-in/decline.
ALTER TABLE public.buyback_declines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read buyback declines" ON public.buyback_declines;
CREATE POLICY "Staff can read buyback declines" ON public.buyback_declines
  FOR SELECT TO authenticated USING (is_staff());
