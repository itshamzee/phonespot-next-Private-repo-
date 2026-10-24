-- 20261013_lager_transfers.sql — flytninger (spec §3.5, §4.3a, §4.4 "Findes andre steder").
-- Lagersystemet ejer flytningerne; her gemmes kun koblingen sag -> flytning og
-- hvilke anmodninger der er mailet (én mail pr. flytning).
-- Kræver 20261013120000_repair_parts_check.sql (den ikke-navngivne kolonne-CHECK
-- derfra hedder repair_tickets_parts_status_check i Postgres).

ALTER TABLE public.repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_parts_status_check;
ALTER TABLE public.repair_tickets ADD CONSTRAINT repair_tickets_parts_status_check
  CHECK (parts_status IN ('ok', 'needs_order', 'ordered', 'requested', 'in_transit', 'unknown'));

CREATE TABLE IF NOT EXISTS public.repair_ticket_transfers (
  transfer_id   text PRIMARY KEY,
  ticket_id     uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  shared_sku    text NOT NULL,
  from_location text NOT NULL,
  qty           integer NOT NULL CHECK (qty > 0),
  status        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repair_ticket_transfers_ticket ON public.repair_ticket_transfers (ticket_id);
CREATE INDEX IF NOT EXISTS repair_ticket_transfers_open ON public.repair_ticket_transfers (updated_at)
  WHERE status IN ('REQUESTED', 'SENT', 'PARTIALLY_RECEIVED');
ALTER TABLE public.repair_ticket_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repair_ticket_transfers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.repair_ticket_transfers TO service_role;

CREATE TABLE IF NOT EXISTS public.lager_transfer_notifications (
  transfer_id text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lager_transfer_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lager_transfer_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lager_transfer_notifications TO service_role;
