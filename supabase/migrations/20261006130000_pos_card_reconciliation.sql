-- POS: kortafstemning ved dagsafslutning.
--
-- The stand-alone Worldline terminal has no API, so staff type amounts by hand.
-- At day close the cashier now also enters the total from the terminal's day
-- report; we compare it with the card payments (kort_terminal, net of card
-- refunds) recorded on the cash session and store both plus the difference.
--
-- Adds (all idempotent):
--   * cash_sessions.expected_card / counted_card / card_difference / card_note
--   * pos_session_net_card(uuid)           - same basis as pos_session_net_cash
--   * pos_close_cash_session(... 8 args)   - NEW overload with p_counted_card + p_card_note
-- The 6-argument pos_close_cash_session from 20261003130000 is left untouched
-- (old callers keep working; they simply leave the card columns NULL).

BEGIN;

ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS expected_card integer,
  ADD COLUMN IF NOT EXISTS counted_card integer,
  ADD COLUMN IF NOT EXISTS card_difference integer,
  ADD COLUMN IF NOT EXISTS card_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_counted_card_nonneg') THEN
    ALTER TABLE public.cash_sessions
      ADD CONSTRAINT cash_sessions_counted_card_nonneg CHECK (counted_card IS NULL OR counted_card >= 0);
  END IF;
END $$;

-- Card payments net of card refunds (refunds are stored as negative rows).
CREATE OR REPLACE FUNCTION public.pos_session_net_card(p_session_id uuid) RETURNS integer
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT coalesce(sum(p.amount_oere), 0)::integer
  FROM public.order_payments p JOIN public.orders o ON o.id = p.order_id
  WHERE o.cash_session_id = p_session_id AND p.type = 'kort_terminal';
$$;

CREATE OR REPLACE FUNCTION public.pos_close_cash_session(
  p_session_id uuid, p_staff_id uuid, p_counted_cash integer, p_cash_to_bank integer,
  p_expenses jsonb, p_notes text, p_counted_card integer, p_card_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s public.cash_sessions%ROWTYPE; e record; v_exp integer := 0; v_net integer; v_expected integer; v_diff integer;
  v_net_card integer; v_card_diff integer;
BEGIN
  SELECT * INTO s FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM public.pos_fail('session_not_found'); END IF;
  IF s.locked OR s.closed_at IS NOT NULL THEN PERFORM public.pos_fail('session_closed'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND is_active) THEN
    PERFORM public.pos_fail('staff_not_found');
  END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN PERFORM public.pos_fail('invalid_counted_cash'); END IF;
  IF p_cash_to_bank IS NULL OR p_cash_to_bank < 0 OR p_cash_to_bank > p_counted_cash THEN
    PERFORM public.pos_fail('invalid_cash_to_bank');
  END IF;
  IF p_counted_card IS NULL OR p_counted_card < 0 THEN PERFORM public.pos_fail('invalid_counted_card'); END IF;
  FOR e IN SELECT x FROM jsonb_array_elements(coalesce(p_expenses, '[]'::jsonb)) x LOOP
    IF btrim(coalesce(e.x->>'description', '')) = '' OR (e.x->>'amount_oere')::integer IS NULL
       OR (e.x->>'amount_oere')::integer <= 0 THEN
      PERFORM public.pos_fail('invalid_expense');
    END IF;
    v_exp := v_exp + (e.x->>'amount_oere')::integer;
  END LOOP;

  -- Serialise against in-flight sales on this register (sales lock the register row).
  PERFORM 1 FROM public.registers WHERE id = s.register_id FOR UPDATE;
  v_net := public.pos_session_net_cash(s.id);
  v_expected := s.opening_float + v_net - v_exp;
  v_diff := p_counted_cash - v_expected;
  v_net_card := public.pos_session_net_card(s.id);
  v_card_diff := p_counted_card - v_net_card;
  IF v_card_diff <> 0 AND btrim(coalesce(p_card_note, '')) = '' THEN
    PERFORM public.pos_fail('card_note_required');
  END IF;

  UPDATE public.cash_sessions SET
    closed_at = clock_timestamp(), closed_by = p_staff_id, counted_cash = p_counted_cash,
    expected_cash = v_expected, difference = v_diff, cash_to_bank = p_cash_to_bank,
    expenses = coalesce(p_expenses, '[]'::jsonb), notes = nullif(btrim(coalesce(p_notes, '')), ''), locked = true,
    expected_card = v_net_card, counted_card = p_counted_card, card_difference = v_card_diff,
    card_note = nullif(btrim(coalesce(p_card_note, '')), '')
  WHERE id = s.id;

  INSERT INTO public.activity_log (actor_id, actor_type, action, entity_type, entity_id, details)
    VALUES (p_staff_id, 'staff', 'pos_session_close', 'cash_session', s.id,
            jsonb_build_object('register_id', s.register_id, 'counted', p_counted_cash,
                               'expected', v_expected, 'difference', v_diff, 'cash_to_bank', p_cash_to_bank,
                               'expected_card', v_net_card, 'counted_card', p_counted_card,
                               'card_difference', v_card_diff));
  RETURN jsonb_build_object('session_id', s.id, 'expected_cash', v_expected, 'counted_cash', p_counted_cash,
                            'difference', v_diff, 'net_cash_payments', v_net, 'expenses_total', v_exp,
                            'expected_card', v_net_card, 'counted_card', p_counted_card,
                            'card_difference', v_card_diff);
END;
$$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.pos_session_net_card(uuid)',
    'public.pos_close_cash_session(uuid,uuid,integer,integer,jsonb,text,integer,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

COMMIT;

-- Verification (run after applying):
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'cash_sessions'
--     AND column_name IN ('expected_card','counted_card','card_difference','card_note');   -- 4 rows
--   SELECT oidvectortypes(proargtypes) FROM pg_proc WHERE proname = 'pos_close_cash_session';  -- 2 rows (6 and 8 args)
--   SELECT has_function_privilege('anon', 'public.pos_close_cash_session(uuid,uuid,integer,integer,jsonb,text,integer,text)', 'execute');  -- false
--   SELECT public.pos_session_net_card(id) FROM public.cash_sessions ORDER BY opened_at DESC LIMIT 1;
