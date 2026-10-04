import { createServerClient } from "@/lib/supabase/client";
import { depositRemaining } from "./deposit-math";

/**
 * Depositum (forudbetaling) på en reparationssag. Læser kassens ordrelinjer:
 * en linje med item_type 'deposit' og repair_ticket_id = sagen. Hvor meget af et
 * depositum der er tilbage udledes (se deposit-math.ts og pos_deposit_remaining
 * i 20261004300000_pos_deposit_schema.sql); ordrelinjer er uforanderlige, så der
 * findes intet "brugt"-flag.
 *
 * Skemaet bag dette kræver migrationerne 20261004300000/20261004300100.
 * Før de er kørt findes kolonnen repair_ticket_id ikke, og kaldet fejler; kalderne
 * (sagssiden) fanger fejlen og viser depositum som "kunne ikke hentes".
 */
export type CaseDeposit = {
  /** order_items.id på depositumlinjen. Bruges som deposit_item_id ved modregning. */
  id: string;
  /** Beløb i øre. */
  amount_oere: number;
  /** ISO-tidspunkt for betalingen. */
  paid_at: string;
  /** Betalingsmetode som gemt i kassen: kontant, kort_terminal, mobilepay, ... eller "split". */
  method: string;
  /** Bonnummer (fx V1-000123), hvis kassen har givet ét. */
  receipt_no: string | null;
  /** Kassesalget (orders.id) depositummet blev taget på. */
  order_id: string;
};

export type CaseDepositWithBalance = CaseDeposit & {
  /** Hvad der stadig kan modregnes (0 når det er brugt). */
  remaining_oere: number;
  /** Modregnet i en sagsbetaling (netto efter evt. fortrudt betaling). */
  applied_oere: number;
};

type DepositRow = {
  id: string;
  order_id: string;
  total_price: number;
  orders: {
    confirmed_at: string | null;
    created_at: string;
    receipt_number: string | null;
    order_number: string;
    status: string;
    order_payments: Array<{ type: string; amount_oere: number }> | null;
  } | null;
};

const FINAL = ["confirmed", "picked_up", "delivered"];

function paymentMethod(payments: Array<{ type: string; amount_oere: number }> | null): string {
  const types = [...new Set((payments ?? []).filter((p) => p.amount_oere > 0).map((p) => p.type))];
  if (types.length === 0) return "ukendt";
  return types.length === 1 ? types[0] : "split";
}

/**
 * Alle depositum modtaget på sagen (ældste først), undtagen dem der er refunderet
 * helt. Med saldo: remaining_oere er det der stadig kan modregnes.
 */
export async function getCaseDeposits(ticketId: string): Promise<CaseDepositWithBalance[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, order_id, total_price,
       orders!inner ( confirmed_at, created_at, receipt_number, order_number, status, order_payments ( type, amount_oere ) )`,
    )
    .eq("repair_ticket_id", ticketId)
    .eq("item_type", "deposit")
    .gt("quantity", 0);
  if (error) throw new Error(`Kunne ikke hente depositum: ${error.message}`);

  const rows = ((data ?? []) as unknown as DepositRow[]).filter((r) => r.orders && FINAL.includes(r.orders.status));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [applied, returned] = await Promise.all([
    supabase.from("order_items").select("deposit_item_id, total_price").in("deposit_item_id", ids),
    supabase
      .from("order_items")
      .select("original_order_item_id, total_price, orders!inner ( type )")
      .in("original_order_item_id", ids)
      .eq("orders.type", "credit_note"),
  ]);
  if (applied.error) throw new Error(`Kunne ikke hente modregninger: ${applied.error.message}`);
  if (returned.error) throw new Error(`Kunne ikke hente refunderinger: ${returned.error.message}`);

  const appliedBy = new Map<string, number[]>();
  for (const a of (applied.data ?? []) as Array<{ deposit_item_id: string; total_price: number }>) {
    appliedBy.set(a.deposit_item_id, [...(appliedBy.get(a.deposit_item_id) ?? []), a.total_price]);
  }
  const returnedBy = new Map<string, number[]>();
  for (const r of (returned.data ?? []) as Array<{ original_order_item_id: string; total_price: number }>) {
    returnedBy.set(r.original_order_item_id, [...(returnedBy.get(r.original_order_item_id) ?? []), r.total_price]);
  }

  const out: CaseDepositWithBalance[] = [];
  for (const r of rows) {
    const appliedLines = appliedBy.get(r.id) ?? [];
    const returnLines = returnedBy.get(r.id) ?? [];
    const refunded = 0 - returnLines.reduce((s, x) => s + x, 0);
    if (refunded >= r.total_price) continue; // refunderet helt
    const o = r.orders!;
    out.push({
      id: r.id,
      amount_oere: r.total_price,
      paid_at: o.confirmed_at ?? o.created_at,
      method: paymentMethod(o.order_payments),
      receipt_no: o.receipt_number ?? o.order_number,
      order_id: r.order_id,
      remaining_oere: depositRemaining({ depositTotal: r.total_price, appliedLines, returnLines }),
      applied_oere: 0 - appliedLines.reduce((s, x) => s + x, 0),
    });
  }
  return out.sort((a, b) => a.paid_at.localeCompare(b.paid_at));
}

/** Samlet beløb der stadig kan modregnes på sagen (øre). */
export async function getOpenDepositTotal(ticketId: string): Promise<number> {
  const deposits = await getCaseDeposits(ticketId);
  return deposits.reduce((s, d) => s + Math.max(0, d.remaining_oere), 0);
}
