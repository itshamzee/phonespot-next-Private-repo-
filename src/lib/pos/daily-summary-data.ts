import { createServerClient } from "@/lib/supabase/client";
import { copenhagenDayBounds, isValidDateString } from "./copenhagen";
import {
  aggregateDailySummary,
  type DailySummary,
  type SummaryOrder,
  type SummarySession,
} from "./daily-summary";
import type { CashExpense } from "./cash-session";
import { PosError } from "./errors";

const FINAL_STATUSES = ["confirmed", "picked_up", "delivered"];

type SessionRow = {
  id: string;
  register_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_float: number;
  counted_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  cash_to_bank: number | null;
  expenses: Array<{ description: string; amount_oere: number }> | null;
  locked: boolean;
};

export type DailySummaryQuery = {
  date: string; // YYYY-MM-DD, Copenhagen calendar day
  registerId?: string | null;
  locationId?: string | null;
};

/**
 * Loads one Copenhagen day for a register (or all registers of a location).
 * The day is the half-open UTC range [start, end) from copenhagenDayBounds, so
 * a sale at 00:30 Danish time on the 2nd never lands on the 1st.
 */
export async function loadDailySummary(q: DailySummaryQuery): Promise<DailySummary> {
  if (!isValidDateString(q.date)) throw new PosError("invalid_date", "Ugyldig dato", 400);
  if (!q.registerId && !q.locationId) throw new PosError("scope_required", "Vælg kasse eller lokation", 400);
  const { startIso, endIso } = copenhagenDayBounds(q.date);
  const supabase = createServerClient();

  let ordersQuery = supabase
    .from("orders")
    .select(
      `id, order_number, receipt_number, receipt_no, type, total, discount_amount, discount_reason,
       vat_total, brugtmoms_total, confirmed_at, payment_method, register_id,
       order_items ( item_type, quantity, total_price, discount_amount, vat_scheme ),
       order_payments ( type, amount_oere )`,
    )
    .in("type", ["pos", "credit_note"])
    .in("status", FINAL_STATUSES)
    .gte("confirmed_at", startIso)
    .lt("confirmed_at", endIso)
    .order("confirmed_at", { ascending: true });
  ordersQuery = q.registerId ? ordersQuery.eq("register_id", q.registerId) : ordersQuery.eq("location_id", q.locationId!);

  const { data: orders, error } = await ordersQuery;
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);

  // Registers in scope (names + ids for the session lookup).
  let regQuery = supabase.from("registers").select("id, name, location_id");
  regQuery = q.registerId ? regQuery.eq("id", q.registerId) : regQuery.eq("location_id", q.locationId!);
  const { data: registers } = await regQuery;
  const regList = (registers ?? []) as Array<{ id: string; name: string; location_id: string }>;
  const regIds = regList.map((r) => r.id);

  let sessions: SummarySession[] = [];
  if (regIds.length > 0) {
    const sessionCols =
      "id, register_id, opened_at, closed_at, opening_float, counted_cash, expected_cash, difference, cash_to_bank, expenses, locked";
    const [{ data: closedRows }, { data: openRows }] = await Promise.all([
      supabase
        .from("cash_sessions")
        .select(sessionCols)
        .in("register_id", regIds)
        .gte("closed_at", startIso)
        .lt("closed_at", endIso),
      supabase.from("cash_sessions").select(sessionCols).in("register_id", regIds).is("closed_at", null),
    ]);
    const rows = [...((closedRows ?? []) as SessionRow[]), ...((openRows ?? []) as SessionRow[])];
    const ids = rows.map((r) => r.id);
    const adjById = new Map<string, number[]>();
    if (ids.length > 0) {
      const { data: adj } = await supabase
        .from("cash_session_adjustments")
        .select("session_id, amount_oere")
        .in("session_id", ids);
      for (const a of adj ?? []) {
        const list = adjById.get(a.session_id) ?? [];
        list.push(a.amount_oere);
        adjById.set(a.session_id, list);
      }
    }
    sessions = rows.map((r) => ({
      id: r.id,
      registerId: r.register_id,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      openingFloat: r.opening_float,
      countedCash: r.counted_cash,
      expectedCash: r.expected_cash,
      difference: r.difference,
      cashToBank: r.cash_to_bank,
      expenses: (r.expenses ?? []).map<CashExpense>((e) => ({ description: e.description, amountOere: e.amount_oere })),
      locked: r.locked,
      adjustments: adjById.get(r.id) ?? [],
    }));
  }

  return aggregateDailySummary((orders ?? []) as unknown as SummaryOrder[], sessions, {
    date: q.date,
    locationId: q.locationId ?? regList[0]?.location_id ?? null,
    registerId: q.registerId ?? null,
    registerName: q.registerId ? (regList[0]?.name ?? null) : null,
  });
}
