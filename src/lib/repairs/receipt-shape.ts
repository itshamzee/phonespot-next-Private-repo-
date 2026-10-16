/**
 * Beløb til kundevendte sagsudskrifter (indleveringsbevis, værkstedsrapport).
 * Bygges af SAMME kilde som sagssiden: caseLines() + computeCaseTotals() (case-money.ts),
 * så nye sager (repair_ticket_items) og ældre booking-sager giver samme tal som i admin.
 * Interne rækker (dele) og den interne begrundelse for afvigende pris når aldrig kunden.
 */
import { formatKrShort, type CaseLine, type CaseTotals } from "@/lib/repairs/case-money";

export type ReceiptLine = {
  name: string;
  qty: number;
  /** Pris pr. stk. i øre. */
  unit_oere: number;
  total_oere: number;
  /** Sat når linjens pris afviger fra listeprisen (listepris pr. stk. i øre). */
  list_unit_oere: number | null;
  /** Allerede betalt i kassen: indgår ikke i det der står til betaling. */
  sold: boolean;
};

export type ReceiptMoney = {
  lines: ReceiptLine[];
  subtotal_oere: number;
  discount_oere: number;
  total_oere: number;
  deposits_oere: number;
  rest_oere: number;
  paid: boolean;
  /** false hvis depositum ikke kunne hentes; så vises hverken depositum eller rest. */
  deposits_ok: boolean;
};

/** Teksten under en linje med afvigende pris. Aldrig den interne begrundelse. */
export function agreedPriceNote(line: Pick<ReceiptLine, "list_unit_oere">): string | null {
  return line.list_unit_oere == null ? null : `Aftalt pris (listepris ${formatKrShort(line.list_unit_oere)})`;
}

/** Ren formning af sagens linjer og totaler til kvitteringen (ingen DB). */
export function shapeReceiptMoney(
  lines: CaseLine[],
  totals: CaseTotals,
  listPriceByItemId: Map<string, number> = new Map(),
  depositsOk = true,
): ReceiptMoney {
  const receiptLines = lines
    .filter((l) => l.kind !== "part")
    .map((l): ReceiptLine => {
      const list = l.item_id ? listPriceByItemId.get(l.item_id) : undefined;
      const deviates = list != null && l.kind !== "free_text" && list !== l.unit_oere;
      return {
        name: l.name,
        qty: l.qty,
        unit_oere: l.unit_oere,
        total_oere: l.total_oere,
        list_unit_oere: deviates ? list : null,
        sold: Boolean(l.sold),
      };
    });
  return {
    lines: receiptLines,
    subtotal_oere: totals.subtotal_oere,
    discount_oere: totals.discount_oere,
    total_oere: totals.total_oere,
    deposits_oere: totals.deposits_oere,
    rest_oere: totals.rest_oere,
    paid: totals.paid,
    deposits_ok: depositsOk,
  };
}

/** Samlede tal for flere sager (indlevering med flere enheder). */
export function sumReceiptMoney(parts: ReceiptMoney[]): Omit<ReceiptMoney, "lines"> {
  return {
    subtotal_oere: parts.reduce((s, p) => s + p.subtotal_oere, 0),
    discount_oere: parts.reduce((s, p) => s + p.discount_oere, 0),
    total_oere: parts.reduce((s, p) => s + p.total_oere, 0),
    deposits_oere: parts.reduce((s, p) => s + p.deposits_oere, 0),
    rest_oere: parts.reduce((s, p) => s + p.rest_oere, 0),
    paid: parts.length > 0 && parts.every((p) => p.paid),
    deposits_ok: parts.every((p) => p.deposits_ok),
  };
}
