-- POS foundation, part 1 of 2: tables and column changes.
-- Apply BEFORE 20261003130000_pos_rpcs.sql.
--
-- Adds: registers, cash_sessions, cash_session_adjustments, order_payments,
-- stock_movements (all append-only / lockable), and the order/order_items
-- columns needed for credit notes, receipt numbers, discount allocation and
-- per-line VAT.
--
-- Assumptions about the live schema (verify before applying; see the trailing
-- verification queries):
--   * orders.payment_status exists (added outside the repo migrations; the
--     checkout RPCs already depend on it).
--   * CHECK constraints on orders.type / order_items.item_type /
--     order_items.quantity have unknown names in prod, so they are located by
--     definition text and dropped dynamically.
--   * locations.type = 'store' identifies the physical shops.

BEGIN;

-- ============================================================
-- registers: one per physical till. Receipt numbers are sequential per register.
-- last_receipt_no is only ever incremented inside pos_create_sale /
-- pos_create_return under a row lock, so numbers are gap-free and never reused.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  last_receipt_no integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, name)
);

-- One register per physical location. Code = first letter of the store plus a
-- counter ("S1", "V1"), unique by construction. More registers (e.g. "Faktura")
-- are added with a plain INSERT.
INSERT INTO public.registers (location_id, name, code)
SELECT s.id, 'Kasse 1',
       upper(left(regexp_replace(s.name, '[^A-Za-z]', '', 'g'), 1)) ||
       row_number() OVER (PARTITION BY upper(left(regexp_replace(s.name, '[^A-Za-z]', '', 'g'), 1)) ORDER BY s.name)
FROM public.locations s
WHERE s.type = 'store'
ON CONFLICT DO NOTHING;

-- ============================================================
-- cash_sessions: one open session per register; closing locks the row.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES public.registers(id) ON DELETE RESTRICT,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by uuid REFERENCES public.staff(id),
  opening_float integer NOT NULL CHECK (opening_float >= 0),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.staff(id),
  counted_cash integer CHECK (counted_cash IS NULL OR counted_cash >= 0),
  expected_cash integer,
  difference integer,
  cash_to_bank integer CHECK (cash_to_bank IS NULL OR cash_to_bank >= 0),
  expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  locked boolean NOT NULL DEFAULT false,
  CHECK (NOT locked OR (closed_at IS NOT NULL AND counted_cash IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_register
  ON public.cash_sessions (register_id) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS cash_sessions_register_opened
  ON public.cash_sessions (register_id, opened_at DESC);

-- Corrections after the lock are new rows here, never edits to the session.
CREATE TABLE IF NOT EXISTS public.cash_session_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE RESTRICT,
  amount_oere integer NOT NULL CHECK (amount_oere <> 0),
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  staff_id uuid REFERENCES public.staff(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_session_adjustments_session
  ON public.cash_session_adjustments (session_id);

CREATE OR REPLACE FUNCTION public.pos_guard_locked_session() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'cash_sessions are append-only and cannot be deleted';
  END IF;
  IF OLD.locked THEN
    RAISE EXCEPTION 'Cash session % is locked. Add an adjustment row instead.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cash_session_locked ON public.cash_sessions;
CREATE TRIGGER trg_cash_session_locked BEFORE UPDATE OR DELETE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.pos_guard_locked_session();

CREATE OR REPLACE FUNCTION public.pos_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (no % allowed)', TG_TABLE_NAME, TG_OP;
END;
$$;
DROP TRIGGER IF EXISTS trg_cash_adjustments_append_only ON public.cash_session_adjustments;
CREATE TRIGGER trg_cash_adjustments_append_only BEFORE UPDATE OR DELETE ON public.cash_session_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.pos_append_only();

-- ============================================================
-- orders / order_items columns
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS register_id uuid REFERENCES public.registers(id),
  ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES public.cash_sessions(id),
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id),
  ADD COLUMN IF NOT EXISTS original_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS receipt_no integer,
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS credit_reason text,
  -- Standard 25 % VAT contained in the order's regular lines (brugtmoms_total
  -- already exists for the margin scheme). Negative on credit notes.
  ADD COLUMN IF NOT EXISTS vat_total integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS orders_register_receipt_unique
  ON public.orders (register_id, receipt_no) WHERE register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_register_confirmed
  ON public.orders (register_id, confirmed_at) WHERE register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_cash_session ON public.orders (cash_session_id) WHERE cash_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_original_order ON public.orders (original_order_id) WHERE original_order_id IS NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_order_item_id uuid REFERENCES public.order_items(id);
CREATE INDEX IF NOT EXISTS order_items_original_item
  ON public.order_items (original_order_item_id) WHERE original_order_item_id IS NOT NULL;

-- orders.type: allow 'credit_note'. The constraint name is unknown in prod, so
-- find it by definition.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%' AND pg_get_constraintdef(oid) ILIKE '%''online''%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('online', 'pos', 'draft', 'shopify', 'credit_note'));

-- order_items.item_type + reference shape: add free_text and deposit lines.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%item_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
  -- Credit-note lines carry a NEGATIVE quantity, so "quantity > 0" must go.
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%quantity%'
  LOOP
    EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS check_item_ref;
ALTER TABLE public.order_items ADD CONSTRAINT check_item_ref CHECK (
  item_type IN ('device', 'sku_product', 'free_text', 'deposit') AND (
    (item_type = 'device' AND device_id IS NOT NULL AND sku_product_id IS NULL) OR
    (item_type = 'sku_product' AND sku_product_id IS NOT NULL AND device_id IS NULL) OR
    (item_type IN ('free_text', 'deposit') AND device_id IS NULL AND sku_product_id IS NULL)
  )
);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_nonzero CHECK (quantity <> 0);

-- ============================================================
-- order_payments: split payments. Sales are positive rows, credit notes are
-- negative rows (refund method = type). Append-only.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN
    ('kontant', 'kort_terminal', 'mobilepay', 'klarna', 'faktura', 'tilgodebevis', 'gavekort')),
  amount_oere integer NOT NULL CHECK (amount_oere <> 0),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_payments_order ON public.order_payments (order_id);
DROP TRIGGER IF EXISTS trg_order_payments_append_only ON public.order_payments;
CREATE TRIGGER trg_order_payments_append_only BEFORE UPDATE OR DELETE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.pos_append_only();

-- ============================================================
-- stock_movements: append-only ledger. product/device ids are deliberately NOT
-- foreign keys so the ledger survives catalogue clean-ups.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  sku_product_id uuid,
  device_id uuid,
  qty_delta integer NOT NULL CHECK (qty_delta <> 0),
  reason text NOT NULL CHECK (reason IN ('sale', 'return', 'adjust', 'receive', 'transfer')),
  ref_order_id uuid,
  ref_note text,
  staff_id uuid,
  CHECK ((sku_product_id IS NOT NULL) <> (device_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS stock_movements_sku ON public.stock_movements (sku_product_id, created_at DESC) WHERE sku_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_device ON public.stock_movements (device_id, created_at DESC) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movements_location ON public.stock_movements (location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_order ON public.stock_movements (ref_order_id) WHERE ref_order_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_stock_movements_append_only ON public.stock_movements;
CREATE TRIGGER trg_stock_movements_append_only BEFORE UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.pos_append_only();

-- Service role only. No policies = no access for anon/authenticated; the admin
-- UI reaches these tables through the /api/pos routes.
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_session_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verification (run after applying; expect the commented results):
--   SELECT code, name, location_id FROM registers ORDER BY code;           -- one row per store, e.g. S1, V1
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid IN ('public.orders'::regclass, 'public.order_items'::regclass) AND contype = 'c';
--                                                                           -- orders_type_check has credit_note; check_item_ref has free_text/deposit; no quantity > 0
--   SELECT count(*) FROM information_schema.columns WHERE table_name = 'orders'
--     AND column_name IN ('register_id','cash_session_id','staff_id','original_order_id','receipt_no','receipt_number','discount_reason','credit_reason','vat_total');  -- 9
