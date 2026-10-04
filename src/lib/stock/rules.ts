import { SCOPE_SLUGS, isOwner, normalizeScopeSlug, type ScopeSlug, type ScopedStaff, type StoreScope } from "@/lib/auth/store-scope";

export type ItemType = "serievare" | "reservedel" | "tilbehoer";

export type OverviewRow = {
  rowKey: string;
  kind: "sku" | "device";
  skuProductId: string | null;
  templateId: string | null;
  storage: string | null;
  grade: string | null;
  name: string;
  itemType: ItemType;
  vatScheme: "brugtmoms" | "regular";
  /** øre; null når medarbejderen ikke må se kostpriser (fjernes på serveren). */
  costPrice: number | null;
  price: number | null;
  priceMax: number | null;
  alwaysInStock: boolean;
  qty: Record<ScopeSlug, number>;
  min: Record<ScopeSlug, number | null>;
  inTransit: number;
};

export type OverviewResult = { rows: OverviewRow[]; total: number; page: number; perPage: number; canSeeCost: boolean };

/** Kostpriser er kun for ejer og manager. */
export function canSeeCost(staff: Pick<ScopedStaff, "role">): boolean {
  return staff.role === "owner" || staff.role === "manager";
}

/** Kan medarbejderen modtage varer (varemodtagelse)? */
export function canReceiveGoods(staff: Pick<ScopedStaff, "role">): boolean {
  return staff.role === "owner" || staff.role === "manager";
}

/**
 * "Min butik" til Kun-<butik>-vælgeren og Anmod-knappen: medarbejderens egen butik;
 * for ejeren den butik der er valgt i topbjælken (null på 'alle').
 */
export function myStoreSlug(staff: ScopedStaff, scope: StoreScope): ScopeSlug | null {
  if (isOwner(staff)) return scope !== "alle" && scope !== "ingen" ? scope : null;
  return normalizeScopeSlug(staff.location_slug);
}

/** Gør en brugerindtastning ufarlig i et PostgREST-filter (ingen komma, parenteser, jokertegn). */
export function searchTokens(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[,()%*\\:"']/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

/** Er antallet under butikkens minimumsniveau? (tilbehør/reservedele med min. sat; aldrig for altid-på-lager) */
export function isLow(row: Pick<OverviewRow, "qty" | "min" | "alwaysInStock">, slug: ScopeSlug): boolean {
  const min = row.min[slug];
  if (row.alwaysInStock || min === null || min <= 0) return false;
  return row.qty[slug] < min;
}

/** Hvor kan "Anmod" tilbyde varer fra? Butikker (ikke min egen) med lager. */
export function requestSources(row: Pick<OverviewRow, "qty" | "alwaysInStock">, mine: ScopeSlug): ScopeSlug[] {
  if (row.alwaysInStock) return [];
  return SCOPE_SLUGS.filter((s) => s !== mine && row.qty[s] > 0);
}

/** Vis Anmod-knappen når min butik står på 0 og en anden butik har lager. */
export function canRequestRow(row: Pick<OverviewRow, "qty" | "alwaysInStock">, mine: ScopeSlug | null): boolean {
  if (!mine || row.qty[mine] > 0) return false;
  return requestSources(row, mine).length > 0;
}
