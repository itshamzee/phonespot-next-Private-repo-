-- D1 hardening: PIN-hemmeligheder flyttes fra staff til staff_pins (RLS, ingen policies),
-- og ordre-snapshot af juridisk enhed overskriver altid klientleverede værdier.

BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_pins (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_pins FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='staff' AND column_name='pin_hash') THEN
    IF (SELECT count(*) FROM public.staff WHERE pin_hash IS NOT NULL) > 0 THEN
      RAISE EXCEPTION 'staff.pin_hash is not empty; refusing to drop';
    END IF;
  END IF;
END $$;

ALTER TABLE public.staff
  DROP COLUMN IF EXISTS pin_hash,
  DROP COLUMN IF EXISTS pin_failed_attempts,
  DROP COLUMN IF EXISTS pin_locked_until;

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
    IF v_cvr IS NOT NULL THEN
      NEW.legal_name := v_name;
      NEW.legal_cvr := v_cvr;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
