-- 20261013120000_repair_parts_check.sql
-- Lagertjek ved booking (spec 2026-10-13 §4.4). Blokerer aldrig kunden:
-- tjekket kører efter svaret (after()) og sætter kun felter, personalet ser.
-- repair_services.id er uuid (jf. 20261005110000_repair_parts_stock.sql).

-- Kobling reparationsydelse -> del i lagersystemets katalog.
-- part_name er en cache til visning: API v1 (Bilag A) har intet navn på Balance.
CREATE TABLE IF NOT EXISTS public.repair_service_parts (
  service_id  uuid NOT NULL REFERENCES public.repair_services(id) ON DELETE CASCADE,
  shared_sku  text NOT NULL,
  qty         integer NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 20),
  part_name   text NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, shared_sku)
);
ALTER TABLE public.repair_service_parts ENABLE ROW LEVEL SECURITY;

-- Sagens delstatus. NULL = ikke tjekket (ingen koblede dele eller ingen butik).
ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS parts_status text NULL
    CHECK (parts_status IN ('ok', 'needs_order', 'ordered', 'unknown')),
  ADD COLUMN IF NOT EXISTS parts_shortage jsonb NULL,
  ADD COLUMN IF NOT EXISTS parts_checked_at timestamptz NULL,
  -- sha256 af den mangel, der sidst blev mailet: én mail pr. sag pr. mangel.
  ADD COLUMN IF NOT EXISTS parts_notified_key text NULL;

CREATE INDEX IF NOT EXISTS repair_tickets_parts_attention
  ON public.repair_tickets (parts_status, parts_checked_at)
  WHERE parts_status IN ('unknown', 'needs_order');
