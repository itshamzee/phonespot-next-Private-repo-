-- POS: X/Z-rapporter hentet fra kortterminalen (Flatpay Socket API).
--
-- Ved kasselukning aflæses terminalens total (X-rapport) i stedet for at blive
-- tastet i hånden, og dagen afsluttes på terminalen (Z-rapport). Z-rapporten
-- kan ikke hentes igen, så svaret gemmes her som dokumentation for afstemningen.
-- Kun service_role læser og skriver (RLS uden policies).

BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_terminal_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  cash_session_id uuid REFERENCES public.cash_sessions(id),
  kind text NOT NULL CHECK (kind IN ('x', 'z')),
  terminal_id text NOT NULL,
  sale_count integer NOT NULL DEFAULT 0,
  sale_amount integer NOT NULL DEFAULT 0,
  refund_count integer NOT NULL DEFAULT 0,
  refund_amount integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  sequential_id integer,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.staff(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_terminal_reports_session_idx ON public.pos_terminal_reports (cash_session_id);
CREATE INDEX IF NOT EXISTS pos_terminal_reports_location_idx ON public.pos_terminal_reports (location_id, created_at DESC);

ALTER TABLE public.pos_terminal_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pos_terminal_reports FROM anon, authenticated;

COMMIT;
