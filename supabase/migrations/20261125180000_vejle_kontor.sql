-- Ny butik "Vejle Kontor" (Løversysselvej 3C) med egen kasse. Fixon ApS.
-- Idempotent. Den gamle butik "Vejle" røres ikke.

BEGIN;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_slug_known;
ALTER TABLE public.locations ADD CONSTRAINT locations_slug_known
  CHECK (slug IS NULL OR slug = ANY (ARRAY['vejle','slagelse','webshop','vejle-gaagade','esbjerg','vejle-kontor']));

INSERT INTO public.locations (name, slug, type, address, phone, email, legal_entity_id)
SELECT 'Vejle Kontor', 'vejle-kontor', 'store', 'Løversysselvej 3C, 7100 Vejle', v.phone, v.email,
       (SELECT id FROM public.legal_entities WHERE cvr = '46079019')
FROM (SELECT 1) one
LEFT JOIN public.locations v ON v.slug = 'vejle'
WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE slug = 'vejle-kontor');

INSERT INTO public.registers (location_id, name, code, active)
SELECT l.id, 'Kasse 1', 'K1', true FROM public.locations l
WHERE l.slug = 'vejle-kontor'
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE code = 'K1')
  AND NOT EXISTS (SELECT 1 FROM public.registers WHERE location_id = l.id AND name = 'Kasse 1');

COMMIT;
