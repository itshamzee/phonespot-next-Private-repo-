/**
 * Beløb til kundevendte sagsudskrifter (indleveringsbevis, værkstedsrapport).
 * Bygges af SAMME kilde som sagssiden: caseLines() + computeCaseTotals() (case-money.ts),
 * så nye sager (repair_ticket_items) og ældre booking-sager giver samme tal som i admin.
 * Interne rækker (dele) og den interne begrundelse for afvigende pris når aldrig kunden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseDeposits } from "@/lib/pos/deposits";
import { loadCaseItemRows } from "@/lib/repairs/case-items";
import { caseLines, computeCaseTotals, type CaseItemRow } from "@/lib/repairs/case-money";
import { shapeReceiptMoney, type ReceiptMoney } from "@/lib/repairs/receipt-shape";

export * from "@/lib/repairs/receipt-shape";

type TicketRow = Parameters<typeof caseLines>[0] & { paid?: boolean | null };

/** Henter en sags linjer, depositum og totaler og former dem til kvitteringen. */
export async function loadReceiptMoney(db: SupabaseClient, ticketId: string, ticket: TicketRow): Promise<ReceiptMoney> {
  const [quotesRes, itemRows, depositsRes] = await Promise.all([
    db.from("repair_quotes").select("price_dkk, accepted_at, declined_at, created_at").eq("ticket_id", ticketId),
    loadCaseItemRows(db, ticketId),
    getCaseDeposits(ticketId).then(
      (deposits) => ({ deposits, ok: true }),
      (err) => {
        console.error("[pdf] deposits failed:", ticketId, err);
        return { deposits: [], ok: false };
      },
    ),
  ]);
  const items: CaseItemRow[] = itemRows.map((r) => ({
    id: r.id,
    parent_item_id: r.parent_item_id,
    kind: r.kind,
    description: r.description,
    qty: r.qty,
    unit_price_oere: r.unit_price_oere,
    stock_status: r.stock_status,
    sku_product_id: r.sku_product_id,
    device_id: r.device_id,
    created_at: r.created_at,
  }));
  const lines = caseLines(ticket, (quotesRes.data ?? []) as Parameters<typeof caseLines>[1], items);
  const totals = computeCaseTotals(lines, depositsRes.deposits, { paid: Boolean(ticket.paid), booking: ticket.booking_details });
  const listById = new Map(itemRows.map((r) => [r.id, r.list_price_oere]));
  return shapeReceiptMoney(lines, totals, listById, depositsRes.ok);
}
