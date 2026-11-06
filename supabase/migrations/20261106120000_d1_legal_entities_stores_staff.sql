-- D1: juridiske enheder pr. butik, Vejle Gågade og Esbjerg, pinkode- og tilladelseskolonner.
-- Idempotent. Eksisterende ordrer får ikke udfyldt snapshot (forbliver NULL).

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cvr text NOT NULL UNIQUE,
  vat_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;

INSERT INTO public.legal_entities (name, cvr, vat_id) VALUES
  ('Fixon ApS', '46079019', 'DK46079019'),
  ('PhoneGo ApS', '38688766', 'DK38688766')
ON CONFLICT (cvr) DO NOTHING;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.legal_entities(id);

-- Tillad de nye slugs (eksisterende check tillod kun vejle/slagelse/webshop).
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_slug_known;
ALTER TABLE public.locations ADD CONSTRAINT locations_slug_known
  CHECK (slug IS NULL OR slug = ANY (ARRAY['vejle','slagelse','webshop','vejle-gaagade','esbjerg']));

-- Nye butikker. Esbjerg har bevidst ingen adresse (må ikke være offentlig).
INSERT INTO public.locations (name, slug, type)
SELECT 'Vejle Gågade', 'vejle-gaagade', 'store'
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE slug = 'vejle-gaagade');

INSERT INTO public.locations (name, slug, type)
SELECT 'Esbjerg', 'esbjerg', 'store'
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE slug = 'esbjerg');

-- Juridisk enhed pr. lokation.
UPDATE public.locations SET legal_entity_id = (SELECT id FROM public.legal_entities WHERE cvr = '38688766')
WHERE slug = 'slagelse';
UPDATE public.locations SET legal_entity_id = (SELECT id FROM public.legal_entities WHERE cvr = '46079019')
WHERE slug IN ('vejle', 'webshop', 'vejle-gaagade', 'esbjerg');

-- Kasser.
INSERT INTO public.registers (location_id, name, code, active)
SELECT l.id, 'Kasse 1', 'G1', true FROM public.locations l
WHERE l.slug = 'vejle-gaagade'
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE code = 'G1')
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE location_id = l.id AND name = 'Kasse 1');

INSERT INTO public.registers (location_id, name, code, active)
SELECT l.id, 'Kasse 1', 'E1', true FROM public.locations l
WHERE l.slug = 'esbjerg'
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE code = 'E1')
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE location_id = l.id AND name = 'Kasse 1');

-- Medarbejdere: pinkode og tilladelser.
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

-- Ordrer: snapshot af juridisk enhed ved oprettelse.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_cvr text;

CREATE OR REPLACE FUNCTION public.orders_snapshot_legal_entity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.legal_cvr IS NULL AND NEW.location_id IS NOT NULL THEN
    SELECT e.name, e.cvr INTO NEW.legal_name, NEW.legal_cvr
    FROM public.locations l
    JOIN public.legal_entities e ON e.id = l.legal_entity_id
    WHERE l.id = NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_snapshot_legal_entity ON public.orders;
CREATE TRIGGER trg_orders_snapshot_legal_entity BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_snapshot_legal_entity();

COMMIT;
