-- Butiks-tilhør (Vejle/Slagelse) på henvendelser og reparationer.
-- store_id er et tekst-slug ('slagelse' | 'vejle') der matcher STORES i
-- src/lib/store-config.ts og reservations.store_id. NULL = generel/ukendt.
-- Alt herunder er idempotent. NB: run-sql.mjs splitter på semikolon og
-- stripper linjekommentarer, saa ingen DO-blokke og ingen semikoloner
-- inde i statements.

-- 1) Kolonner
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS store_id text;

ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS store_id text;

-- 2) CHECK-constraints (drop + add = idempotent, ADD CONSTRAINT har ikke IF NOT EXISTS)
ALTER TABLE public.contact_inquiries DROP CONSTRAINT IF EXISTS contact_inquiries_store_id_check;

ALTER TABLE public.contact_inquiries ADD CONSTRAINT contact_inquiries_store_id_check CHECK (store_id IS NULL OR store_id IN ('slagelse', 'vejle'));

ALTER TABLE public.repair_tickets DROP CONSTRAINT IF EXISTS repair_tickets_store_id_check;

ALTER TABLE public.repair_tickets ADD CONSTRAINT repair_tickets_store_id_check CHECK (store_id IS NULL OR store_id IN ('slagelse', 'vejle'));

-- 3) Indeks
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_store_created ON public.contact_inquiries (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_tickets_store_created ON public.repair_tickets (store_id, created_at DESC);

-- 4) Backfill fra metadata->>'preferredStore' (kun hvor store_id er NULL,
--    saa gentagne koersler ikke aendrer noget)
UPDATE public.contact_inquiries
SET store_id = lower(trim(metadata->>'preferredStore'))
WHERE store_id IS NULL
  AND lower(trim(metadata->>'preferredStore')) IN ('vejle', 'slagelse');
