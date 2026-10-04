-- Repair deposit (depositum) model, part 1 of 2: schema.
-- Apply AFTER 20261003130000_pos_rpcs.sql and BEFORE 20261004300100_pos_deposit_rpcs.sql.
--
-- A deposit is a PREPAYMENT on a repair case ("we order an expensive screen and
-- take a small deposit in the store"). Flow:
--   1. Deposit sale     one POS order, one line item_type 'deposit' (positive),
--                       order_items.repair_ticket_id = the case. 25 % VAT is
--                       carried on the receipt (VAT is due on prepayment).
--   2. Final payment    one POS order with a 'repair_service' line (the case
--                       total, VAT on the FULL price) and a negative
--                       'deposit_applied' line per deposit used. The negative
--                       line points at the deposit line through deposit_item_id.
--                       Total VAT over both orders = VAT on the full price.
--   3. Refund           a deposit that has not been applied is returned through
--                       the normal return flow (credit note on the deposit line).
--
-- Order lines are immutable once the order is confirmed, so "consumed" is NOT a
-- flag on the deposit line. It is derived (pos_deposit_remaining):
--   remaining = deposit.total_price
--             + sum(total_price of lines with deposit_item_id = deposit)       -- applied (negative), reversals (positive)
--             + sum(total_price of credit-note lines returning the deposit)    -- negative
-- A BEFORE INSERT trigger refuses to apply more than the remaining balance, so a
-- deposit can never be applied twice, even by a hand-written INSERT.
--
-- Assumptions about the live schema (verify before applying):
--   * public.repair_tickets(id uuid PK, paid boolean, paid_at timestamptz,
--     customer_id uuid, ticket_number text) exist (migrations 001_repair_system
--     and 20260310_mega_upgrade).
--   * order_items.item_type CHECK is the one created by 20261003120000
--     (check_item_ref); any other CHECK that mentions item_type is dropped here.
--   * public.pos_fail(text,text) exists (20261003130000).

BEGIN;

-- ------------------------------------------------------------
-- Columns
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS repair_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE RESTRICT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS repair_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS deposit_item_id uuid REFERENCES public.order_items(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS orders_repair_ticket
  ON public.orders (repair_ticket_id) WHERE repair_ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_items_repair_ticket
  ON public.order_items (repair_ticket_id) WHERE repair_ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_items_deposit_item
  ON public.order_items (deposit_item_id) WHERE deposit_item_id IS NOT NULL;

-- ------------------------------------------------------------
-- Constraints: new item types + reference shape
-- ------------------------------------------------------------
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
END $$;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS check_item_ref;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_deposit_ref_check;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_ticket_required_check;

ALTER TABLE public.order_items ADD CONSTRAINT check_item_ref CHECK (
  item_type IN ('device', 'sku_product', 'free_text', 'deposit', 'repair_service', 'deposit_applied') AND (
    (item_type = 'device' AND device_id IS NOT NULL AND sku_product_id IS NULL) OR
    (item_type = 'sku_product' AND sku_product_id IS NOT NULL AND device_id IS NULL) OR
    (item_type IN ('free_text', 'deposit', 'repair_service', 'deposit_applied')
       AND device_id IS NULL AND sku_product_id IS NULL)
  )
);

-- deposit_item_id is set exactly on deposit_applied lines (and on the credit-note
-- lines that reverse them, which keep that item_type).
ALTER TABLE public.order_items ADD CONSTRAINT order_items_deposit_ref_check
  CHECK ((item_type = 'deposit_applied') = (deposit_item_id IS NOT NULL));

-- Deposit, repair and applied-deposit lines must name their case. NOT VALID so a
-- deposit line created by the old, case-less "Depositum" button (if any exist)
-- does not block the migration; the rule is enforced for every new row.
ALTER TABLE public.order_items ADD CONSTRAINT order_items_ticket_required_check
  CHECK (item_type NOT IN ('deposit', 'repair_service', 'deposit_applied')
         OR repair_ticket_id IS NOT NULL
         OR original_order_item_id IS NOT NULL)   -- credit-note lines of legacy case-less deposits
  NOT VALID;

-- ------------------------------------------------------------
-- Remaining balance of one deposit line (oere). NULL if it is not a deposit line.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_deposit_remaining(p_deposit_item_id uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT (
    d.total_price
    + coalesce((SELECT sum(x.total_price) FROM public.order_items x
                 WHERE x.deposit_item_id = d.id), 0)
    + coalesce((SELECT sum(x.total_price) FROM public.order_items x
                  JOIN public.orders o ON o.id = x.order_id
                 WHERE x.original_order_item_id = d.id AND o.type = 'credit_note'), 0)
  )::integer
  FROM public.order_items d
  WHERE d.id = p_deposit_item_id AND d.item_type = 'deposit' AND d.quantity > 0;
$$;

-- ------------------------------------------------------------
-- Backstop: a positive-quantity deposit_applied line may never exceed what is
-- left on the deposit. Locking the deposit row serialises two sales that try to
-- use the same deposit at the same time (the second sees the first one's line).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pos_guard_deposit_applied() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_rem integer;
BEGIN
  IF NEW.quantity > 0 THEN
    IF NEW.total_price >= 0 THEN PERFORM public.pos_fail('invalid_price'); END IF;
    PERFORM 1 FROM public.order_items WHERE id = NEW.deposit_item_id AND item_type = 'deposit' FOR UPDATE;
    IF NOT FOUND THEN PERFORM public.pos_fail('deposit_not_found'); END IF;
    v_rem := public.pos_deposit_remaining(NEW.deposit_item_id);
    IF -NEW.total_price > coalesce(v_rem, 0) THEN
      PERFORM public.pos_fail('deposit_exceeded', coalesce(v_rem, 0)::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deposit_applied_guard ON public.order_items;
CREATE TRIGGER trg_deposit_applied_guard
  BEFORE INSERT ON public.order_items
  FOR EACH ROW WHEN (NEW.item_type = 'deposit_applied')
  EXECUTE FUNCTION public.pos_guard_deposit_applied();

REVOKE ALL ON FUNCTION public.pos_deposit_remaining(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pos_deposit_remaining(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.pos_guard_deposit_applied() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Verification (run after applying):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid = 'public.order_items'::regclass AND contype = 'c';
--       -- check_item_ref lists 6 item types; order_items_deposit_ref_check; order_items_ticket_required_check (NOT VALID)
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name IN ('orders','order_items') AND column_name IN ('repair_ticket_id','deposit_item_id');  -- 3 rows
--   SELECT count(*) FROM order_items WHERE item_type = 'deposit' AND repair_ticket_id IS NULL;
--       -- legacy case-less deposit lines (expected 0); they are exempt from the NOT VALID check
--   SELECT public.pos_deposit_remaining(gen_random_uuid());   -- NULL
