/**
 * En sag må ikke meldes afhentet, mens der står et beløb åbent. Afhentet uden betaling kræver en
 * kort begrundelse (faktura/erhverv, kulance), som skrives i sagens statuslog og dermed tidslinjen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseDeposits, type CaseDeposit } from "@/lib/pos/deposits";
import { caseLines, computeCaseTotals, formatKrShort } from "@/lib/repairs/case-money";
import { loadCaseItems } from "@/lib/repairs/case-items";

export const UNPAID_REASON_MAX = 200;

/** Rest ved afhentning i øre (0 for en betalt sag). Ved fejl på depositum regnes uden dem (strengere). */
export async function loadCaseRestOere(
  db: SupabaseClient,
  ticket: { id: string; paid?: boolean | null; services?: unknown; booking_details?: unknown },
): Promise<number> {
  if (ticket.paid) return 0;
  const [quotes, items, deposits] = await Promise.all([
    db.from("repair_quotes").select("price_dkk, accepted_at, declined_at, created_at").eq("ticket_id", ticket.id),
    loadCaseItems(db, ticket.id),
    getCaseDeposits(ticket.id).catch((err): CaseDeposit[] => {
      console.error("[pickup-guard] deposits failed:", ticket.id, err);
      return [];
    }),
  ]);
  const lines = caseLines(
    ticket as Parameters<typeof caseLines>[0],
    (quotes.data ?? []) as Parameters<typeof caseLines>[1],
    items,
  );
  return computeCaseTotals(lines, deposits, {
    paid: false,
    booking: ticket.booking_details as NonNullable<Parameters<typeof computeCaseTotals>[2]>["booking"],
  }).rest_oere;
}

export function unpaidPickupMessage(restOere: number): string {
  return `Sagen er ikke betalt: ${formatKrShort(restOere)} står til betaling. Gå til kassen, eller angiv en begrundelse for at melde den afhentet uden betaling.`;
}

/** Statuslog-noten for en afhentning uden betaling. */
export function unpaidPickupNote(restOere: number, reason: string): string {
  return `Afhentet uden betaling (${formatKrShort(restOere)} udestår): ${reason}`;
}
