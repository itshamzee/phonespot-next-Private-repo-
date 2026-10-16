/**
 * Tilbudsprisen er sagens pris. Er der linjer på sagen (repair_ticket_items), er det linjerne
 * der giver prisen, så et tilbud der afviger fra sagens total skal flytte linjerne:
 *  - præcis én prissat linje: ret dens stykpris, så totalen rammer tilbuddet
 *  - flere linjer og tilbuddet er højere: tilføj en fritekstlinje "Tilbudsjustering"
 *  - flere linjer og tilbuddet er lavere: ret en eksisterende "Tilbudsjustering", ellers kræv at
 *    personalet retter linjepriserne (priser kan ikke være negative)
 * Sager uden linjer (ældre sager) rører vi ikke: der er tilbuddet prisen via caseLines().
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { addCaseItem, updateCaseItemPrice } from "@/lib/repairs/case-create";
import { CaseError } from "@/lib/repairs/case-errors";
import { caseLines, computeCaseTotals, formatKrShort, type CaseItemRow } from "@/lib/repairs/case-money";
import { loadCaseItems } from "@/lib/repairs/case-items";

export const QUOTE_ADJUSTMENT_LABEL = "Tilbudsjustering";

export type QuoteAdjustment =
  | { action: "none" }
  | { action: "set_price"; itemId: string; newUnitOere: number }
  | { action: "update_adjustment"; itemId: string; newUnitOere: number }
  | { action: "add_line"; amountOere: number }
  | { action: "blocked"; message: string };

const PRICED_KINDS = new Set(["repair", "free_text", "product"]);

/** Hvad der skal ske med linjerne, så sagens total bliver `targetOere`. */
export function planQuoteAdjustment(items: CaseItemRow[], targetOere: number): QuoteAdjustment {
  const live = items.filter((i) => i.stock_status !== "released");
  if (live.length === 0) return { action: "none" };

  const lines = caseLines({}, [], live);
  const current = computeCaseTotals(lines, []).total_oere;
  const diff = targetOere - current;
  if (diff === 0) return { action: "none" };

  // Solgte linjer er betalt for sig og står ikke i totalen.
  const open = live.filter((i) => i.stock_status !== "sold");
  const priced = open.filter((i) => PRICED_KINDS.has(i.kind));
  const blocked: QuoteAdjustment = {
    action: "blocked",
    message: `Tilbuddet (${formatKrShort(targetOere)}) er lavere end sagens linjer (${formatKrShort(current)}). Ret linjepriserne på sagen først, og send så tilbuddet.`,
  };

  if (priced.length === 1) {
    const only = priced[0];
    const unit = only.unit_price_oere + diff / only.qty;
    if (Number.isInteger(unit) && unit >= 0) return { action: "set_price", itemId: only.id, newUnitOere: unit };
  }

  const existing = open.find((i) => i.kind === "free_text" && i.description === QUOTE_ADJUSTMENT_LABEL && i.qty === 1);
  if (existing && existing.unit_price_oere + diff >= 0) {
    return { action: "update_adjustment", itemId: existing.id, newUnitOere: existing.unit_price_oere + diff };
  }
  return diff > 0 ? { action: "add_line", amountOere: diff } : blocked;
}

function danishDate(d = new Date()): string {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Copenhagen" }).format(d);
}

/**
 * Får sagens total til at matche tilbuddet. Kaster CaseError ved en blokering eller en databasefejl,
 * før tilbuddet gemmes. Returnerer true hvis linjerne blev ændret.
 */
export async function applyQuotePrice(
  db: SupabaseClient,
  ticketId: string,
  quoteOere: number,
  staff: StaffIdentity,
): Promise<boolean> {
  const items = await loadCaseItems(db, ticketId);
  const plan = planQuoteAdjustment(items, quoteOere);
  const reason = `Tilbud sendt ${danishDate()}`;
  switch (plan.action) {
    case "none":
      return false;
    case "blocked":
      throw new CaseError("quote_below_lines", plan.message, 409);
    case "set_price":
    case "update_adjustment":
      await updateCaseItemPrice(ticketId, plan.itemId, plan.newUnitOere, reason, staff, db);
      return true;
    case "add_line":
      await addCaseItem(
        ticketId,
        { kind: "free_text", description: QUOTE_ADJUSTMENT_LABEL, unit_price_oere: plan.amountOere, qty: 1 },
        staff,
        db,
      );
      return true;
  }
}
