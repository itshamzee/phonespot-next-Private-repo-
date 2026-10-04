-- Sagsstyring: lovet afhentningstidspunkt og ansvarlig pr. reparationssag.
--
-- Listen grupperer efter afhentningsdag, og sagssiden viser "Lovet klar" og
-- "Ansvarlig". Begge felter er valgfrie: koden falder tilbage til kundens
-- ønskede dag (webbooking) eller oprettelsesdag + tilbuddets estimat, så intet
-- går i stykker, hvis migrationen ikke er kørt endnu.
--
-- Idempotent og transaktionel. Ingen data ændres.

BEGIN;

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS promised_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to text;

COMMENT ON COLUMN public.repair_tickets.promised_at IS
  'Lovet afhentningstidspunkt (vises som "Lovet klar" og styrer grupperingen i Sagsstyring).';
COMMENT ON COLUMN public.repair_tickets.assigned_to IS
  'Ansvarlig medarbejder (fritekst: navn), bruges til filteret "Ansvarlig" i Sagsstyring.';

CREATE INDEX IF NOT EXISTS repair_tickets_promised_at_idx
  ON public.repair_tickets (promised_at)
  WHERE promised_at IS NOT NULL;

-- SMS-tråden og historikken slår op på sagens id.
CREATE INDEX IF NOT EXISTS sms_log_ticket_created_idx
  ON public.sms_log (ticket_id, created_at);

COMMIT;
