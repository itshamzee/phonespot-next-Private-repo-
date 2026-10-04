/**
 * Nøgletal til Overblik, rene funktioner uden I/O. Alle beløb er i øre.
 *
 * Fortegn: salg er positive, kreditnotaer negative (som i dagsopgørelsen), så
 * netto-tallene har allerede returvarer trukket fra. Kreditnota-linjer har
 * negativ mængde, så kostpris = purchase_price * quantity vender også fortegn.
 *
 * Profit = omsætning ekskl. moms minus kostpris:
 *   omsætning ekskl. moms = total - depositum - standardmoms - brugtmoms
 * Brugtmoms er ikke fortjeneste, så den trækkes fra ligesom 25 %-momsen.
 * Depositum er forudbetaling: linjer af typen "deposit" (positiv) og "deposit_applied"
 * (negativ, når depositummet bruges på den endelige regning) holdes uden for omsætning
 * og profit. Momsen på dem bogføres dog, når depositummet modtages, så den indgår i
 * momsopgørelsen men ikke i omsætning ekskl. moms.
 */

export type OverviewItem = {
  item_type?: string | null;
  quantity?: number | null;
  total_price?: number | null;
  discount_amount?: number | null;
  purchase_price?: number | null;
  vat_amount?: number | null;
  vat_scheme?: "brugtmoms" | "regular" | null;
};

export type OverviewOrder = {
  id?: string;
  type: string;
  total: number | null;
  vat_total?: number | null;
  brugtmoms_total?: number | null;
  location_id?: string | null;
  order_items?: OverviewItem[] | null;
};

export type Kpis = {
  /** Omsætning inkl. moms, netto af returvarer og uden depositum. */
  revenue: number;
  salesCount: number;
  creditCount: number;
  avgBasket: number;
  revenueExVat: number;
  cost: number;
  profit: number;
  /** Profit i procent af omsætning ekskl. moms; null uden omsætning. */
  marginPct: number | null;
  vatStandard: number;
  brugtmoms: number;
  /** Modtaget depositum (netto), ikke indtægt endnu. */
  deposits: number;
};

const isDepositLine = (it: OverviewItem) => it.item_type === "deposit" || it.item_type === "deposit_applied";
const lineAmount = (it: OverviewItem) => (it.total_price ?? 0) - (it.discount_amount ?? 0);

function depositOf(o: OverviewOrder): number {
  return (o.order_items ?? []).filter(isDepositLine).reduce((s, i) => s + lineAmount(i), 0);
}

/**
 * Webshop-ordrer gemmer ikke 25 %-momsen i vat_total (kun brugtmoms), så den
 * udledes af de almindelige linjer: moms = brutto / 5.
 */
export function estimateStandardVat(items: OverviewItem[]): number {
  let gross = 0;
  for (const it of items) {
    if (isDepositLine(it) || it.vat_scheme === "brugtmoms") continue;
    gross += lineAmount(it);
  }
  return Math.round(gross / 5);
}

export function computeKpis(orders: OverviewOrder[]): Kpis {
  let total = 0;
  let salesCount = 0;
  let creditCount = 0;
  let salesBasketBase = 0;
  let vatStandard = 0;
  let brugtmoms = 0;
  let deposits = 0;
  let depositLines = 0;
  let depositVat = 0;
  let cost = 0;

  for (const o of orders) {
    const items = o.order_items ?? [];
    total += o.total ?? 0;
    if (o.type === "credit_note") creditCount += 1;
    else {
      salesCount += 1;
      salesBasketBase += (o.total ?? 0) - depositOf(o);
    }

    const vat = o.vat_total ?? 0;
    vatStandard += vat === 0 && o.type === "online" ? estimateStandardVat(items) : vat;
    brugtmoms += o.brugtmoms_total ?? 0;

    for (const it of items) {
      if (isDepositLine(it)) {
        depositLines += lineAmount(it);
        depositVat += it.vat_amount ?? 0;
        if (it.item_type === "deposit") deposits += lineAmount(it);
      } else cost += (it.purchase_price ?? 0) * (it.quantity ?? 0);
    }
  }

  const revenue = total - depositLines;
  const revenueExVat = revenue - (vatStandard - depositVat) - brugtmoms;
  const profit = revenueExVat - cost;

  return {
    revenue,
    salesCount,
    creditCount,
    avgBasket: salesCount > 0 ? Math.round(salesBasketBase / salesCount) : 0,
    revenueExVat,
    cost,
    profit,
    marginPct: revenueExVat > 0 ? Math.round((profit / revenueExVat) * 100) : null,
    vatStandard,
    brugtmoms,
    deposits,
  };
}

/** Procentvis ændring mod forrige periode; null hvis der ikke er noget at sammenligne med. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Grupperer ordrer pr. butik-slug; ordrer uden fysisk lokation hører til webshoppen. */
export function groupByStore<T extends { location_id?: string | null }>(
  orders: T[],
  slugOf: (locationId: string | null | undefined) => string | null,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const o of orders) {
    const slug = slugOf(o.location_id) ?? "webshop";
    (out[slug] ??= []).push(o);
  }
  return out;
}
