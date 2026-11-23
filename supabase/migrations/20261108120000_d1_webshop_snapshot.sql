-- D1: webshop- og kladdeordrer (ingen location_id) snapshotter webshoppens juridiske enhed.

BEGIN;

CREATE OR REPLACE FUNCTION public.orders_snapshot_legal_entity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_cvr text;
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    SELECT e.name, e.cvr INTO v_name, v_cvr
    FROM public.locations l
    JOIN public.legal_entities e ON e.id = l.legal_entity_id
    WHERE l.id = NEW.location_id;
  ELSIF NEW.type IN ('online', 'draft') THEN
    SELECT e.name, e.cvr INTO v_name, v_cvr
    FROM public.locations l
    JOIN public.legal_entities e ON e.id = l.legal_entity_id
    WHERE l.slug = 'webshop';
  END IF;
  IF v_cvr IS NOT NULL THEN
    NEW.legal_name := v_name;
    NEW.legal_cvr := v_cvr;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill. Uforanderlighedstriggeren blokerer opdateringer af bekraeftede ordrer,
-- saa den slaas kun fra inde i denne transaktion og kun for denne ene opdatering
-- (legal_name/legal_cvr fra NULL til vaerdi; ingen andre kolonner roeres).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.orders'::regclass AND tgname = 'trg_order_immutability') THEN
    ALTER TABLE public.orders DISABLE TRIGGER trg_order_immutability;
  END IF;
END $$;

UPDATE public.orders o
SET legal_name = e.name, legal_cvr = e.cvr
FROM public.locations l
JOIN public.legal_entities e ON e.id = l.legal_entity_id
WHERE l.slug = 'webshop'
  AND o.legal_cvr IS NULL
  AND o.location_id IS NULL
  AND o.type IN ('online', 'draft')
  AND o.created_at >= '2026-11-06';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.orders'::regclass AND tgname = 'trg_order_immutability') THEN
    ALTER TABLE public.orders ENABLE TRIGGER trg_order_immutability;
  END IF;
END $$;

COMMIT;
