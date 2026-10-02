-- 20261003100000_locations_slug.sql
--
-- Butiksmodel: `locations` er kilden til sandhed (uuid). `slug` er den stabile
-- nøgle koden bruger til at oversætte mellem de to andre butiksmodeller:
--   * text-slugs 'vejle' | 'slagelse' i repair_tickets.store_id,
--     contact_inquiries.store_id m.fl. (20260728_store_attribution.sql)
--   * staff.location_id / orders.location_id (uuid)
-- Slug-værdier: 'vejle', 'slagelse', 'webshop' (den online lokation).
--
-- Idempotent: kan køres flere gange. Rører ikke store_id-kolonnerne.

ALTER TABLE locations ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill. Kun den ÆLDSTE række pr. slug får værdien, så et evt. dublet-seed
-- (008_seed_data.sql har ingen unik nøgle at konflikte på) ikke vælter indekset.
WITH candidates AS (
  SELECT
    id,
    CASE
      WHEN type = 'online' THEN 'webshop'
      WHEN lower(btrim(name)) = 'vejle' THEN 'vejle'
      WHEN lower(btrim(name)) = 'slagelse' THEN 'slagelse'
      ELSE NULL
    END AS wanted,
    created_at
  FROM locations
  WHERE slug IS NULL
), ranked AS (
  SELECT id, wanted,
         row_number() OVER (PARTITION BY wanted ORDER BY created_at, id) AS rn
  FROM candidates
  WHERE wanted IS NOT NULL
)
UPDATE locations l
SET slug = r.wanted
FROM ranked r
WHERE l.id = r.id
  AND r.rn = 1
  AND NOT EXISTS (SELECT 1 FROM locations x WHERE x.slug = r.wanted);

-- Manglende lokationer oprettes, så oversættelsen aldrig peger ud i intet.
INSERT INTO locations (name, address, type, email, slug)
SELECT 'Vejle', 'Vejle, Denmark', 'store', 'vejle@phonespot.dk', 'vejle'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE slug = 'vejle');

INSERT INTO locations (name, address, type, email, slug)
SELECT 'Slagelse', 'Slagelse, Denmark', 'store', 'slagelse@phonespot.dk', 'slagelse'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE slug = 'slagelse');

INSERT INTO locations (name, address, type, email, slug)
SELECT 'Webshop', 'phonespot.dk', 'online', 'info@phonespot.dk', 'webshop'
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE slug = 'webshop');

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_slug_unique
  ON locations (slug) WHERE slug IS NOT NULL;

-- Kun de tre kendte slugs er gyldige (lige backfillet, så constrainten kan lægges direkte på).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_slug_known'
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT locations_slug_known
      CHECK (slug IS NULL OR slug IN ('vejle', 'slagelse', 'webshop'));
  END IF;
END $$;

-- Hurtigt opslag af en medarbejders butik
CREATE INDEX IF NOT EXISTS idx_staff_location ON staff (location_id);

COMMENT ON COLUMN locations.slug IS
  'Stabil nøgle: vejle | slagelse | webshop. Oversætter til text-kolonnerne store_id (vejle/slagelse).';

DO $$
BEGIN
  IF to_regclass('public.store_locations') IS NOT NULL THEN
    COMMENT ON TABLE store_locations IS
      'DEPRECATED (2026-10): erstattet af locations (+ locations.slug). Må ikke bruges af ny kode; droppes når intet læser den.';
  END IF;
END $$;

-- Verifikation (skal returnere præcis 3 rækker: vejle, slagelse, webshop):
--   SELECT id, name, type, slug FROM locations WHERE slug IS NOT NULL ORDER BY slug;
-- Medarbejdere uden butik (ejeren må gerne stå uden):
--   SELECT name, email, role FROM staff WHERE is_active AND location_id IS NULL;
