import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface TemplateRow {
  id: string;
  model: string;
  base_price_a: number | null;
}

interface DeviceRow {
  selling_price: number | null;
  status: string;
  storage: string | null;
}

// Returns PhoneSpot's own refurbished sale price (øre) = min listed device
// selling_price for the model (+storage if any listed), else template
// base_price_a, else null. Matches the storefront's "fra X kr" notion.
export async function lookupBaseValueOre(
  client: SupabaseAdmin,
  model: string,
  storage: string,
): Promise<number | null> {
  // .limit(1) rather than .maybeSingle(): two templates sharing a model string
  // make PostgREST answer 406, which would throw in the middle of pricing.
  const { data: templates } = await client
    .from("product_templates")
    .select("id, model, base_price_a")
    .eq("model", model)
    .limit(1);

  const tpl = ((templates ?? []) as TemplateRow[])[0];
  if (!tpl) return null;

  const { data: devices } = await client
    .from("devices")
    .select("selling_price, status, storage")
    .eq("template_id", tpl.id)
    .eq("status", "listed")
    .not("selling_price", "is", null)
    .gt("selling_price", 0);

  const listed = ((devices ?? []) as DeviceRow[]).filter(
    (d) => d.status === "listed" && d.selling_price != null, // defensive: don't rely only on server-side filters
  );
  // Prefer same-storage listings; fall back to any-storage listing for the model.
  const sameStorage = listed.filter((d) => d.storage === storage);
  const pool = sameStorage.length > 0 ? sameStorage : listed;

  if (pool.length > 0) {
    return Math.min(...pool.map((d) => d.selling_price as number));
  }
  return tpl.base_price_a ?? null;
}
