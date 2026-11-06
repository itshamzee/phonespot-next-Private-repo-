-- 20261013_repair_ticket_parts.sql
-- "Dele brugt" på reparationssager + outbox mod det fælles lagersystem
-- (spec 2026-10-13 §4.2). Rækken gemmes lokalt først (pending) og sendes
-- via after(); /api/cron/lagersystem-outbox prøver igen hvert minut, og efter
-- 24 t uden held bliver status 'failed'. Fjernes en del, oprettes en RETURN-
-- række (reverses_id = TAKE-rækken) med egen idempotency-nøgle.

CREATE TABLE IF NOT EXISTS public.repair_ticket_parts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        uuid NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  movement_type    text NOT NULL DEFAULT 'TAKE' CHECK (movement_type IN ('TAKE', 'RETURN')),
  reverses_id      uuid NULL REFERENCES public.repair_ticket_parts(id),
  shared_sku       text NOT NULL,
  part_name        text NOT NULL,
  qty              integer NOT NULL CHECK (qty BETWEEN 1 AND 100),
  location_code    text NOT NULL,
  cost_at_time_ore integer NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  movement_id      text NULL,
  idempotency_key  text NOT NULL UNIQUE,
  actor_label      text NOT NULL,
  reference        text NOT NULL,
  created_by       uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  voided_at        timestamptz NULL,
  pending_since    timestamptz NOT NULL DEFAULT now(),
  attempts         integer NOT NULL DEFAULT 0,
  last_attempt_at  timestamptz NULL,
  last_error       text NULL,
  synced_at        timestamptz NULL,
  CONSTRAINT repair_ticket_parts_return_has_reverse
    CHECK ((movement_type = 'RETURN') = (reverses_id IS NOT NULL))
);

-- Højst én RETURN pr. TAKE (dobbeltklik på "Fjern" giver ikke to returneringer).
CREATE UNIQUE INDEX IF NOT EXISTS repair_ticket_parts_one_return
  ON public.repair_ticket_parts (reverses_id) WHERE reverses_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS repair_ticket_parts_ticket
  ON public.repair_ticket_parts (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS repair_ticket_parts_pending
  ON public.repair_ticket_parts (created_at) WHERE status = 'pending';

-- Kun service-role (API-routes) læser og skriver; ingen politikker = ingen anon/authenticated-adgang.
ALTER TABLE public.repair_ticket_parts ENABLE ROW LEVEL SECURITY;
