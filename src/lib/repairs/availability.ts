/**
 * Lagerstatus for reservedele og tilkøb, formet til UI'et. Rene funktioner uden I/O.
 *
 * Regler (docs/ny-sag-spec-2026-10.md):
 *  - "altid på lager" (sku_products.always_in_stock) = ikke optalt: `tracked: false`,
 *    `available: null`, intet reserveres og intet blokeres.
 *  - Med lagerstyring er tilgængeligt = quantity - reserved_qty i butikken, aldrig under 0.
 *  - `other_locations` viser den anden butiks tilgængelige antal; `in_transit` er antal på
 *    vej til butikken i en afsendt overførsel.
 */
import type {
  CaseStore,
  OtherLocationStock,
  RepairQuality,
  RepairServiceCategory,
  RepairServiceOption,
  StockInfo,
} from "@/lib/repairs/new-case-types";

export const CASE_STORES: readonly CaseStore[] = ["vejle", "slagelse"];

export type StockRow = {
  product_id: string;
  location_id: string;
  quantity: number | null;
  reserved_qty?: number | null;
};

/** quantity - reserved_qty, aldrig under 0. */
export function availableQty(row: Pick<StockRow, "quantity" | "reserved_qty"> | null | undefined): number {
  if (!row) return 0;
  return Math.max(0, (row.quantity ?? 0) - (row.reserved_qty ?? 0));
}

export function isCaseStore(v: unknown): v is CaseStore {
  return v === "vejle" || v === "slagelse";
}

/** location-parameteren i URL'en. Ukendt eller manglende giver null (så vises ingen butikstal). */
export function parseLocationParam(v: string | null | undefined): CaseStore | null {
  const s = (v ?? "").trim().toLowerCase();
  return isCaseStore(s) ? s : null;
}

export type ShapeStockInput = {
  alwaysInStock: boolean | null | undefined;
  /** Alle lagerrækker for varen (alle lokationer). */
  rows: StockRow[];
  location: CaseStore | null;
  locationIdBySlug: Partial<Record<CaseStore | "webshop", string>>;
  inTransit?: number;
};

export function shapeStock(input: ShapeStockInput): StockInfo {
  const tracked = !input.alwaysInStock;
  if (!tracked) {
    return { tracked: false, available: null, other_locations: [], in_transit: 0 };
  }
  const byLocation = new Map(input.rows.map((r) => [r.location_id, r]));
  const availableAt = (slug: CaseStore) => {
    const id = input.locationIdBySlug[slug];
    return id ? availableQty(byLocation.get(id)) : 0;
  };
  const others: OtherLocationStock[] = CASE_STORES.filter((s) => s !== input.location).map((slug) => ({
    slug,
    available: availableAt(slug),
  }));
  return {
    tracked: true,
    available: input.location ? availableAt(input.location) : null,
    other_locations: input.location ? others : CASE_STORES.map((slug) => ({ slug, available: availableAt(slug) })),
    in_transit: Math.max(0, input.inTransit ?? 0),
  };
}

/** Kan delen/varen tages i butikken nu? Altid på lager tæller som ja. */
export function inStockHere(stock: Pick<StockInfo, "tracked" | "available"> | null | undefined): boolean {
  if (!stock) return true; // ingen del koblet: intet at vente på
  return !stock.tracked || (stock.available ?? 0) > 0;
}

const QUALITY_ORDER: Record<RepairQuality, number> = { standard: 0, premium: 1, original: 2 };

function qualityRank(q: RepairQuality | null): number {
  return q ? QUALITY_ORDER[q] : 3;
}

/**
 * Forvalg i en kategori: den billigste kvalitet der er på lager (eller altid på lager).
 * Er intet på lager, den billigste overhovedet. Ved lige pris vinder den laveste kvalitet.
 */
export function recommendedServiceId(services: RepairServiceOption[]): string | null {
  if (services.length === 0) return null;
  const byPrice = (a: RepairServiceOption, b: RepairServiceOption) =>
    a.price_oere - b.price_oere || qualityRank(a.quality_tier) - qualityRank(b.quality_tier) || a.name.localeCompare(b.name, "da");
  const inStock = services.filter((s) => inStockHere(s.part)).sort(byPrice);
  return (inStock[0] ?? [...services].sort(byPrice)[0]).id;
}

const FIRST_CATEGORIES = ["skærmskift", "batteriskift"];

/** Grupperer reparationer pr. normaliseret kategori. Skærm og batteri først, resten alfabetisk. */
export function groupByCategory(services: RepairServiceOption[], categoryOf: (s: RepairServiceOption) => string | null): RepairServiceCategory[] {
  const groups = new Map<string, RepairServiceOption[]>();
  for (const s of services) {
    const name = categoryOf(s)?.trim() || "Øvrige";
    groups.set(name, [...(groups.get(name) ?? []), s]);
  }
  const rank = (name: string) => {
    const i = FIRST_CATEGORIES.indexOf(name.toLowerCase());
    return i === -1 ? FIRST_CATEGORIES.length : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || (a === "Øvrige" ? 1 : b === "Øvrige" ? -1 : a.localeCompare(b, "da")))
    .map(([name, list]) => {
      const sorted = [...list].sort(
        (a, b) => qualityRank(a.quality_tier) - qualityRank(b.quality_tier) || a.price_oere - b.price_oere || a.name.localeCompare(b.name, "da"),
      );
      return { name, services: sorted, recommended_service_id: recommendedServiceId(sorted) };
    });
}

/** Fjerner kostpris fra en del (alle andre end manager og owner). */
export function stripPartCost<T extends { part: { cost_oere?: number | null } | null }>(service: T): T {
  if (!service.part) return service;
  const { cost_oere: _cost, ...rest } = service.part;
  void _cost;
  return { ...service, part: rest };
}

/** Må rollen se kostpriser? */
export function canSeeCost(role: string | null | undefined): boolean {
  return role === "owner" || role === "manager";
}
