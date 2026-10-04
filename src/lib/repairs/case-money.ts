/**
 * Beløb på en sag: varelinjer, rabat, depositum og "Rest ved afhentning".
 * Alt regnes i hele øre, så vi aldrig får flydende komma-fejl.
 */
import type { CaseDeposit } from "@/lib/pos/deposits";

export type CaseLine = {
  id: string;
  name: string;
  qty: number;
  /** Pris pr. stk. i øre. */
  unit_oere: number;
  total_oere: number;
  kind: "service" | "glass" | "quote" | "repair" | "part" | "device" | "product" | "free_text";
  /** Kun for linjer fra repair_ticket_items. */
  item_id?: string;
  sku_product_id?: string | null;
  device_id?: string | null;
  stock_status?: string;
  /** Enhedens momsordning (kun device-linjer); brugtmoms regnes i kassen. */
  vat_scheme?: "brugtmoms" | "regular";
  /** Allerede solgt i kassen: tæller ikke med i det der står til betaling. */
  sold?: boolean;
};

/** En række fra repair_ticket_items, som caseLines() bruger. */
export type CaseItemRow = {
  id: string;
  parent_item_id?: string | null;
  kind: "repair" | "part" | "device" | "product" | "free_text";
  description: string;
  qty: number;
  unit_price_oere: number;
  stock_status: string;
  sku_product_id?: string | null;
  device_id?: string | null;
  created_at?: string;
  vat_scheme?: "brugtmoms" | "regular";
};

/** Linjer der indgår i ÉN repair_service-linje i kassen (reparation, fritekst og ældre sagers linjer). */
export function isRepairLineKind(kind: CaseLine["kind"]): boolean {
  return kind !== "device" && kind !== "product" && kind !== "part";
}

/** Linjer kassen sælger som egne varelinjer (rigtig lager- og momsbehandling). */
export function isOwnLineKind(kind: CaseLine["kind"]): boolean {
  return kind === "device" || kind === "product";
}

export type CaseTotals = {
  subtotal_oere: number;
  discount_oere: number;
  total_oere: number;
  deposits_oere: number;
  /** Det kunden skal betale ved afhentning. 0 hvis sagen er betalt. */
  rest_oere: number;
  /** Depositum der overstiger sagens pris (skal refunderes eller krediteres). */
  overpaid_oere: number;
  paid: boolean;
};

export function dkkToOere(dkk: number | string | null | undefined): number {
  const n = typeof dkk === "string" ? Number(dkk.replace(",", ".")) : (dkk ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** 1198 kr. giver "1.198,00 kr." (dansk format). */
export function formatKr(oere: number): string {
  const sign = oere < 0 ? "-" : "";
  const abs = Math.abs(Math.round(oere));
  const kr = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${kr},${String(abs % 100).padStart(2, "0")} kr.`;
}

/** Korte beløb uden decimaler når de er hele kroner: "899 kr." */
export function formatKrShort(oere: number): string {
  return oere % 100 === 0 ? formatKr(oere).replace(",00", "") : formatKr(oere);
}

type TicketForMoney = {
  services?: { id?: string; name: string; price_dkk: number }[] | null;
  booking_details?: {
    selected_services?: { id?: string; name: string; price_dkk: number }[];
    total_price_dkk?: number | null;
    discount_percent?: number | null;
    includes_tempered_glass?: boolean;
  } | null;
};

type QuoteForMoney = { price_dkk: number; accepted_at?: string | null; declined_at?: string | null; created_at?: string };

export const TEMPERED_GLASS_DKK = 99;

/**
 * Linjerne på sagen. Indleverede sager har `services`; webbookinger har
 * `booking_details.selected_services` (+ evt. beskyttelsesglas). Uden begge bruges
 * det seneste ikke-afslåede tilbud som én linje.
 */
export function caseLines(ticket: TicketForMoney, quotes: QuoteForMoney[] = [], items: CaseItemRow[] = []): CaseLine[] {
  // 1. Sagens egne linjer (Ny sag) har forrang. Frigivne linjer (annulleret sag) vises ikke.
  const live = items.filter((i) => i.stock_status !== "released");
  if (live.length > 0) {
    return [...live]
      .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
      .map((i): CaseLine => ({
        id: i.id,
        item_id: i.id,
        name: i.description,
        qty: i.qty,
        unit_oere: i.unit_price_oere,
        total_oere: i.unit_price_oere * i.qty,
        kind: i.kind,
        sku_product_id: i.sku_product_id ?? null,
        device_id: i.device_id ?? null,
        stock_status: i.stock_status,
        vat_scheme: i.kind === "device" ? (i.vat_scheme ?? "brugtmoms") : undefined,
        sold: i.stock_status === "sold",
      }));
  }

  const fromServices = (ticket.services ?? []).filter((s) => s && s.name);
  if (fromServices.length > 0) {
    return fromServices.map((s, i) => ({
      id: s.id ?? `svc-${i}`,
      name: s.name,
      qty: 1,
      unit_oere: dkkToOere(s.price_dkk),
      total_oere: dkkToOere(s.price_dkk),
      kind: "service" as const,
    }));
  }

  const booking = ticket.booking_details;
  const bookingLines: CaseLine[] = (booking?.selected_services ?? []).map((s, i) => ({
    id: s.id ?? `booking-${i}`,
    name: s.name,
    qty: 1,
    unit_oere: dkkToOere(s.price_dkk),
    total_oere: dkkToOere(s.price_dkk),
    kind: "service" as const,
  }));
  if (booking?.includes_tempered_glass) {
    bookingLines.push({
      id: "glass",
      name: "Beskyttelsesglas",
      qty: 1,
      unit_oere: dkkToOere(TEMPERED_GLASS_DKK),
      total_oere: dkkToOere(TEMPERED_GLASS_DKK),
      kind: "glass",
    });
  }
  if (bookingLines.length > 0) return bookingLines;

  const quote = [...quotes]
    .filter((q) => !q.declined_at)
    .sort(
      (a, b) =>
        Number(Boolean(b.accepted_at)) - Number(Boolean(a.accepted_at)) ||
        String(b.created_at).localeCompare(String(a.created_at)),
    )[0];
  if (quote) {
    return [
      {
        id: "quote",
        name: "Reparation (tilbud)",
        qty: 1,
        unit_oere: dkkToOere(quote.price_dkk),
        total_oere: dkkToOere(quote.price_dkk),
        kind: "quote",
      },
    ];
  }
  return [];
}

/**
 * I alt, rabat og rest ved afhentning.
 * - Webbookingens `total_price_dkk` er facit for rabatten (rabatten er forskellen).
 * - Ellers bruges `discount_percent`, hvis den er sat.
 * - Rest = I alt minus betalte depositum, aldrig under 0; en betalt sag har rest 0.
 */
export function computeCaseTotals(
  lines: CaseLine[],
  deposits: Pick<CaseDeposit, "amount_oere">[],
  opts: { paid?: boolean; booking?: TicketForMoney["booking_details"] } = {},
): CaseTotals {
  // Linjer der allerede er solgt i kassen er betalt for sig og står ikke til betaling igen.
  const subtotal = lines.reduce((sum, l) => sum + (l.sold ? 0 : l.total_oere), 0);
  const booking = opts.booking;

  let discount = 0;
  if (booking && booking.total_price_dkk != null && lines.length > 0 && lines.every((l) => l.kind !== "quote")) {
    discount = Math.max(0, subtotal - dkkToOere(booking.total_price_dkk));
  } else if (booking?.discount_percent && booking.discount_percent > 0) {
    discount = Math.round((subtotal * booking.discount_percent) / 100);
  }
  discount = Math.min(discount, subtotal);

  const total = subtotal - discount;
  const depositsSum = deposits.reduce((sum, d) => sum + Math.max(0, d.amount_oere), 0);
  const paid = Boolean(opts.paid);
  return {
    subtotal_oere: subtotal,
    discount_oere: discount,
    total_oere: total,
    deposits_oere: depositsSum,
    rest_oere: paid ? 0 : Math.max(0, total - depositsSum),
    overpaid_oere: Math.max(0, depositsSum - total),
    paid,
  };
}

const METHOD_LABELS: Record<string, string> = {
  card: "kort",
  kort: "kort",
  cash: "kontant",
  kontant: "kontant",
  mobilepay: "MobilePay",
  klarna: "Klarna",
  invoice: "faktura",
  faktura: "faktura",
  terminal: "kort",
  kort_terminal: "kort",
  split: "flere betalingsmetoder",
};

/** Betalingsmetode som personalet siger den: "card" bliver til "kort". */
export function methodLabel(method: string | null | undefined): string {
  const key = (method ?? "").trim().toLowerCase();
  return METHOD_LABELS[key] ?? (key || "ukendt metode");
}
