import type { OverviewOrder } from "@/lib/admin/overview/kpi";
import type { StatBucket } from "./range";
import type { Category, StaffLookup, StatLine } from "./lines";

/** Opdelinger af statistik-linjer. Rene funktioner, beløb i øre. */

export type Totals = {
  revenue: number;
  revenueInclVat: number;
  cost: number;
  profit: number;
  marginPct: number | null;
  /** Antal linjer uden kostpris. */
  missingCost: number;
};

const UNASSIGNED = "Ikke fordelt";
const round1 = (n: number) => Math.round(n * 10) / 10;

export function sumLines(lines: StatLine[]): Totals {
  let revenue = 0;
  let revenueInclVat = 0;
  let cost = 0;
  let missingCost = 0;
  for (const l of lines) {
    revenue += l.revenue;
    revenueInclVat += l.revenueInclVat;
    cost += l.cost;
    if (l.missingCost) missingCost += 1;
  }
  const profit = revenue - cost;
  return {
    revenue,
    revenueInclVat,
    cost,
    profit,
    marginPct: revenue > 0 ? round1((profit / revenue) * 100) : null,
    missingCost,
  };
}

function bucketize<K extends string>(lines: StatLine[], key: (l: StatLine) => K): Map<K, StatLine[]> {
  const m = new Map<K, StatLine[]>();
  for (const l of lines) {
    const k = key(l);
    const arr = m.get(k);
    if (arr) arr.push(l);
    else m.set(k, [l]);
  }
  return m;
}

/** Totaler pr. nøgle; kun nøgler med linjer er med. */
export function groupLines<K extends string>(lines: StatLine[], key: (l: StatLine) => K): Record<K, Totals> {
  const out = {} as Record<K, Totals>;
  for (const [k, ls] of bucketize(lines, key)) out[k] = sumLines(ls);
  return out;
}

/** Totaler pr. tidsinterval [startIso, endIso), opdelt på type. Linjer uden for intervallerne udelades. */
export function seriesByBucket(
  lines: StatLine[],
  buckets: StatBucket[],
): { key: string; label: string; webshop: Totals; kasse: Totals; reparation: Totals; total: Totals }[] {
  const bounds = buckets.map((b) => ({ start: Date.parse(b.startIso), end: Date.parse(b.endIso) }));
  const perBucket: StatLine[][] = buckets.map(() => []);
  for (const l of lines) {
    const t = Date.parse(l.at);
    const i = bounds.findIndex((b) => t >= b.start && t < b.end);
    if (i >= 0) perBucket[i].push(l);
  }
  return buckets.map((b, i) => {
    const ls = perBucket[i];
    return {
      key: b.key,
      label: b.label,
      webshop: sumLines(ls.filter((l) => l.stream === "webshop")),
      kasse: sumLines(ls.filter((l) => l.stream === "kasse")),
      reparation: sumLines(ls.filter((l) => l.stream === "reparation")),
      total: sumLines(ls),
    };
  });
}

/** Mest solgte efter omsætning ekskl. moms. "Fragt og rabatter" er ikke et produkt og udelades. */
export function topProducts(
  lines: StatLine[],
  limit: number,
): { productKey: string; name: string; category: Category; units: number; totals: Totals }[] {
  const products = lines.filter((l) => l.productKey !== "oevrigt");
  return [...bucketize(products, (l) => l.productKey)]
    .map(([productKey, ls]) => ({
      productKey,
      name: ls.find((l) => l.name)?.name ?? ls[0].name,
      category: ls[0].category,
      units: ls.reduce((s, l) => s + l.quantity, 0),
      totals: sumLines(ls),
    }))
    .sort((a, b) => b.totals.revenue - a.totals.revenue)
    .slice(0, limit);
}

/**
 * Medarbejdertabel over kassesalg og reparationer (webshop har ingen medarbejder).
 * Salg = forskellige kasseordrer med mindst én vare (ikke kreditnota, ikke kun
 * "Fragt og rabatter"), reparationer = forskellige sager. Linjer uden
 * medarbejder samles i "Ikke fordelt", som kun vises når den ikke er 0.
 */
export function staffTable(
  lines: StatLine[],
  staff: StaffLookup,
  storeOfStaff: Map<string, string>,
): { staffId: string | null; name: string; store: string | null; sales: number; repairs: number; totals: Totals }[] {
  const nameOf = new Map(staff.map((s) => [s.id, s.name]));
  const inStores = lines.filter((l) => l.stream !== "webshop");
  const rows = [...bucketize(inStores, (l) => l.staffId ?? "")].map(([id, ls]) => ({
    staffId: id || null,
    name: id ? nameOf.get(id) ?? "Ukendt medarbejder" : UNASSIGNED,
    store: id ? storeOfStaff.get(id) ?? null : null,
    sales: new Set(ls.filter((l) => l.stream === "kasse" && !l.isCredit && l.category !== "oevrigt").map((l) => l.orderId)).size,
    repairs: new Set(ls.filter((l) => l.productKey.startsWith("ticket:")).map((l) => l.productKey)).size,
    totals: sumLines(ls),
  }));
  const assigned = rows.filter((r) => r.staffId !== null).sort((a, b) => b.totals.revenue - a.totals.revenue);
  const unassigned = rows.find((r) => r.staffId === null);
  // Også kostpris tæller som "ikke 0", så rækkerne altid summer til totalen.
  const show = unassigned && (unassigned.totals.revenue !== 0 || unassigned.totals.cost !== 0);
  return show ? [...assigned, unassigned] : assigned;
}

/** Antal salg og kreditnotaer, talt som computeKpis. */
export function countOrders(orders: OverviewOrder[]): { sales: number; credits: number } {
  let credits = 0;
  for (const o of orders) if (o.type === "credit_note") credits += 1;
  return { sales: orders.length - credits, credits };
}

/** Procentvis ændring med én decimal; null uden positivt sammenligningsgrundlag. */
export function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return round1(((current - previous) / previous) * 100);
}
