import { createServerClient } from "@/lib/supabase/client";
import { SCOPE_SLUGS, type ScopeSlug, type ScopedStaff } from "@/lib/auth/store-scope";
import { canSeeCost, searchTokens, type ItemType, type OverviewResult, type OverviewRow } from "./rules";

export * from "./rules";

type Db = ReturnType<typeof createServerClient>;

export const OVERVIEW_PER_PAGE = 25;

type Raw = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" ? v : v === null || v === undefined ? null : Number(v));

export function mapOverviewRow(r: Raw): OverviewRow {
  const qty = {} as Record<ScopeSlug, number>;
  const min = {} as Record<ScopeSlug, number | null>;
  for (const slug of SCOPE_SLUGS) {
    qty[slug] = num(r[`qty_${slug}`]) ?? 0;
    min[slug] = num(r[`min_${slug}`]);
  }
  return {
    rowKey: String(r.row_key),
    kind: r.kind === "device" ? "device" : "sku",
    skuProductId: (r.sku_product_id as string | null) ?? null,
    templateId: (r.template_id as string | null) ?? null,
    storage: (r.storage as string | null) ?? null,
    grade: (r.grade as string | null) ?? null,
    name: String(r.name ?? ""),
    itemType: (r.item_type as ItemType) ?? "tilbehoer",
    vatScheme: r.vat_scheme === "brugtmoms" ? "brugtmoms" : "regular",
    costPrice: num(r.cost_price),
    price: num(r.price),
    priceMax: num(r.price_max),
    alwaysInStock: r.always_in_stock === true,
    qty,
    min,
    inTransit: num(r.in_transit) ?? 0,
  };
}

const BASE_COLUMNS =
  "row_key, kind, sku_product_id, template_id, storage, grade, name, item_type, vat_scheme, price, price_max, always_in_stock, qty_vejle, qty_slagelse, qty_webshop, min_vejle, min_slagelse, min_webshop, in_transit";

/**
 * Side af varelisten (server-side søgning, filter og sideinddeling mod viewet
 * stock_overview). Kostpris udelades helt fra svaret for medarbejdere uden manager-rolle.
 */
export async function queryOverview(
  staff: Pick<ScopedStaff, "role">,
  opts: { q?: string | null; onlyStore?: ScopeSlug | null; page?: number; perPage?: number },
  db: Db = createServerClient(),
): Promise<OverviewResult> {
  const cost = canSeeCost(staff);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? OVERVIEW_PER_PAGE));
  const page = Math.max(1, Math.floor(opts.page ?? 1));

  let query = db
    .from("stock_overview")
    .select(cost ? `${BASE_COLUMNS}, cost_price` : BASE_COLUMNS, { count: "exact" })
    .order("name", { ascending: true })
    .order("row_key", { ascending: true })
    .range((page - 1) * perPage, page * perPage - 1);

  for (const token of searchTokens(opts.q)) query = query.ilike("search_text", `%${token}%`);
  if (opts.onlyStore) query = query.or(`qty_${opts.onlyStore}.gt.0,min_${opts.onlyStore}.gt.0`);

  const { data, error, count } = await query;
  if (error) throw new Error(`stock overview failed: ${error.message}`);
  return {
    rows: ((data ?? []) as unknown as Raw[]).map(mapOverviewRow),
    total: count ?? 0,
    page,
    perPage,
    canSeeCost: cost,
  };
}

