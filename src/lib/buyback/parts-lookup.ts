import type { createAdminClient } from "@/lib/supabase/admin";
import type { FaultType } from "./types";
import { faultCategoryKeywords, faultQualityKeywords } from "./fault-mapping";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface CatalogRow {
  category: string | null;
  quality: string | null;
  price_dkk: number | null;
  in_stock: boolean | null;
  model_codes: string[] | null;
  suitable_for: string | null;
  title: string | null;
}

function matchesCategory(row: CatalogRow, fault: FaultType): boolean {
  const haystack = `${row.category ?? ""} ${row.title ?? ""}`.toLowerCase();
  return faultCategoryKeywords[fault].some((kw) => haystack.includes(kw));
}

function isOriginalQuality(row: CatalogRow): boolean {
  const q = (row.quality ?? "").toLowerCase();
  return faultQualityKeywords.some((kw) => q.includes(kw));
}

// Returns the cheapest in-stock, original-quality part price (øre) that fits the
// model and fault, or null if none found.
export async function lookupPartPriceOre(
  client: SupabaseAdmin,
  model: string,
  fault: FaultType,
): Promise<number | null> {
  const { data, error } = await client
    .from("foneday_catalog")
    .select("category, quality, price_dkk, in_stock, model_codes, suitable_for, title")
    .contains("model_codes", [model])
    .eq("in_stock", true);

  if (error || !data) return null;

  const rows = data as CatalogRow[];
  const candidates = rows
    .filter((r) => r.in_stock === true) // defensive: don't rely only on server-side .eq
    .filter((r) => r.price_dkk != null && r.price_dkk > 0)
    .filter((r) => matchesCategory(r, fault))
    .filter((r) => isOriginalQuality(r))
    .map((r) => r.price_dkk as number);

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}
