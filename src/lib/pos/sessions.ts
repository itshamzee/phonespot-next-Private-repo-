import { createServerClient } from "@/lib/supabase/client";
import { rpcError } from "./errors";
import { computeExpectedCash, finalDifference, type CashExpense } from "./cash-session";

export type RegisterInfo = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  openSession: OpenSession | null;
};

export type OpenSession = {
  id: string;
  openedAt: string;
  openingFloat: number;
  /** Live: kontant payments net of cash refunds so far (before expenses). */
  netCashPayments: number;
  expectedCash: number;
};

export type SessionHistoryRow = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  countedCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  cashToBank: number | null;
  locked: boolean;
  expenses: CashExpense[];
  adjustments: Array<{ id: string; amountOere: number; reason: string; createdAt: string }>;
  finalDifference: number | null;
  notes: string | null;
};

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
  notes: string | null;
};

export async function listRegisters(locationId: string): Promise<RegisterInfo[]> {
  const supabase = createServerClient();
  const { data: regs, error } = await supabase
    .from("registers")
    .select("id, name, code, location_id")
    .eq("location_id", locationId)
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Failed to load registers: ${error.message}`);
  const list = regs ?? [];
  if (list.length === 0) return [];

  const { data: open } = await supabase
    .from("cash_sessions")
    .select("id, register_id, opened_at, opening_float")
    .in(
      "register_id",
      list.map((r) => r.id),
    )
    .is("closed_at", null);

  const result: RegisterInfo[] = [];
  for (const r of list) {
    const s = (open ?? []).find((o) => o.register_id === r.id);
    let openSession: OpenSession | null = null;
    if (s) {
      const { data: net } = await supabase.rpc("pos_session_net_cash", { p_session_id: s.id });
      const netCash = typeof net === "number" ? net : 0;
      openSession = {
        id: s.id,
        openedAt: s.opened_at,
        openingFloat: s.opening_float,
        netCashPayments: netCash,
        expectedCash: computeExpectedCash({ openingFloat: s.opening_float, netCashPayments: netCash, expenses: [] }),
      };
    }
    result.push({ id: r.id, name: r.name, code: r.code, locationId: r.location_id, openSession });
  }
  return result;
}

export async function recentSessions(registerId: string, limit = 8): Promise<SessionHistoryRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("cash_sessions")
    .select(
      "id, register_id, opened_at, closed_at, opening_float, counted_cash, expected_cash, difference, cash_to_bank, expenses, locked, notes",
    )
    .eq("register_id", registerId)
    .order("opened_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as SessionRow[];
  if (rows.length === 0) return [];

  const { data: adj } = await supabase
    .from("cash_session_adjustments")
    .select("id, session_id, amount_oere, reason, created_at")
    .in(
      "session_id",
      rows.map((r) => r.id),
    )
    .order("created_at", { ascending: true });

  return rows.map((r) => {
    const adjustments = (adj ?? [])
      .filter((a) => a.session_id === r.id)
      .map((a) => ({ id: a.id, amountOere: a.amount_oere, reason: a.reason, createdAt: a.created_at }));
    return {
      id: r.id,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      openingFloat: r.opening_float,
      countedCash: r.counted_cash,
      expectedCash: r.expected_cash,
      difference: r.difference,
      cashToBank: r.cash_to_bank,
      locked: r.locked,
      expenses: (r.expenses ?? []).map((e) => ({ description: e.description, amountOere: e.amount_oere })),
      adjustments,
      finalDifference:
        r.difference == null
          ? null
          : finalDifference(
              r.difference,
              adjustments.map((a) => a.amountOere),
            ),
      notes: r.notes,
    };
  });
}

export async function openCashSession(args: { registerId: string; staffId: string; openingFloat: number }) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("pos_open_cash_session", {
    p_register_id: args.registerId,
    p_staff_id: args.staffId,
    p_opening_float: args.openingFloat,
  });
  if (error) throw rpcError("Kassen kunne ikke åbnes", error);
  return data as { session_id: string };
}

export async function closeCashSession(args: {
  sessionId: string;
  staffId: string;
  countedCash: number;
  cashToBank: number;
  expenses: CashExpense[];
  notes?: string | null;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("pos_close_cash_session", {
    p_session_id: args.sessionId,
    p_staff_id: args.staffId,
    p_counted_cash: args.countedCash,
    p_cash_to_bank: args.cashToBank,
    p_expenses: args.expenses.map((e) => ({ description: e.description, amount_oere: e.amountOere })),
    p_notes: args.notes ?? null,
  });
  if (error) throw rpcError("Kassen kunne ikke lukkes", error);
  return data as {
    session_id: string;
    expected_cash: number;
    counted_cash: number;
    difference: number;
    net_cash_payments: number;
    expenses_total: number;
  };
}

export async function addSessionAdjustment(args: {
  sessionId: string;
  staffId: string;
  amountOere: number;
  reason: string;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("pos_add_session_adjustment", {
    p_session_id: args.sessionId,
    p_staff_id: args.staffId,
    p_amount_oere: args.amountOere,
    p_reason: args.reason,
  });
  if (error) throw rpcError("Justeringen kunne ikke gemmes", error);
  return data as { adjustment_id: string };
}

export async function adjustStock(args: {
  productId: string;
  locationId: string;
  delta: number;
  reason: "adjust" | "receive";
  note?: string | null;
  staffId: string;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("pos_adjust_stock", {
    p_product_id: args.productId,
    p_location_id: args.locationId,
    p_delta: args.delta,
    p_reason: args.reason,
    p_note: args.note ?? null,
    p_staff_id: args.staffId,
  });
  if (error) throw rpcError("Lagerreguleringen kunne ikke gemmes", error);
  return data as { quantity: number };
}
