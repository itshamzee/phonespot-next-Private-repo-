import type { createAdminClient } from "@/lib/supabase/admin";
import type { FaultType } from "./types";
import { faultCategories, originalQualities } from "./fault-mapping";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface CatalogRow {
  category: string | null;
  quality: string | null;
  price_dkk: number | null;
  in_stock: boolean | null;
  suitable_for: string | null;
  title: string | null;
}

// Foneday keeps MANUFACTURER part numbers in model_codes ("A2412", "A2643",
// "SM-A125") and the marketing name in suitable_for ("iPhone 13 Pro Max"), which
// is a comma-separated list when one part fits several devices. Looking a model
// up by model_codes therefore never matches — verified 2026-07-28: zero hits for
// "iPhone 12" across all 15.874 rows. Everything goes through suitable_for.
function catalogSegments(row: CatalogRow): string[] {
  return (row.suitable_for ?? "")
    .split(",")
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);
}

// Our template models read "iPhone SE (2022)"; Foneday writes "iPhone SE 2022".
export function catalogModelName(model: string): string {
  return model
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesModel(row: CatalogRow, model: string): boolean {
  // Exact segment match, never substring: "iPhone 13" must not pick up an
  // "iPhone 13 Pro Max" part, which costs nearly twice as much.
  return catalogSegments(row).includes(catalogModelName(model));
}

function matchesCategory(row: CatalogRow, fault: FaultType): boolean {
  const category = (row.category ?? "").trim().toLowerCase();
  return faultCategories[fault].some((name) => name.toLowerCase() === category);
}

function isOriginalQuality(row: CatalogRow): boolean {
  return originalQualities.includes((row.quality ?? "").trim().toLowerCase());
}

// Returns the cheapest in-stock, original-quality part price (øre) that fits the
// model and fault, or null if none found.
export async function lookupPartPriceOre(
  client: SupabaseAdmin,
  model: string,
  fault: FaultType,
): Promise<number | null> {
  const normalized = catalogModelName(model);
  if (!normalized) return null;

  const { data, error } = await client
    .from("foneday_catalog")
    .select("category, quality, price_dkk, in_stock, suitable_for, title")
    // Narrow server-side; the exact segment match below does the real work.
    .ilike("suitable_for", `%${normalized}%`)
    .in("category", faultCategories[fault])
    .eq("in_stock", true);

  if (error || !data) return null;

  const candidates = (data as CatalogRow[])
    .filter((r) => r.in_stock === true) // defensive: don't rely only on server-side filters
    .filter((r) => r.price_dkk != null && r.price_dkk > 0)
    .filter((r) => matchesModel(r, model))
    .filter((r) => matchesCategory(r, fault))
    .filter((r) => isOriginalQuality(r))
    .map((r) => r.price_dkk as number);

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}
