// src/lib/foneday/sync.ts
// Foneday catalog sync — upsert, price/stock update, missing detection

import { createAdminClient } from "@/lib/supabase/admin";
import { getProducts } from "./client";
import { clearMapCache } from "./mapper";
import type { FonedayProduct, FonedaySettings, SyncStats } from "./types";

/**
 * Auto-link a SKU accessory to device templates based on Foneday compatibility
 * data (model_codes array and suitable_for string).
 *
 * Called after a foneday_sku_link row is created or updated.
 */
export async function autoLinkTemplates(
  supabase: ReturnType<typeof createAdminClient>,
  accessoryId: string,
  fonedayCatalogId: string,
): Promise<void> {
  const { data: catalog } = await supabase
    .from("foneday_catalog")
    .select("model_codes, suitable_for")
    .eq("id", fonedayCatalogId)
    .single();

  if (!catalog) return;

  // Build a deduplicated list of search terms from both fields.
  const termSet = new Set<string>();
  if (Array.isArray(catalog.model_codes)) {
    for (const mc of catalog.model_codes) {
      if (mc && typeof mc === "string") termSet.add(mc.trim());
    }
  }
  if (catalog.suitable_for && typeof catalog.suitable_for === "string") {
    termSet.add(catalog.suitable_for.trim());
  }

  if (termSet.size === 0) return;

  // For each term, find matching product_templates by display_name ILIKE.
  for (const term of termSet) {
    const { data: templates } = await supabase
      .from("product_templates")
      .select("id")
      .ilike("display_name", `%${term}%`);

    if (!templates?.length) continue;

    await supabase
      .from("sku_product_templates")
      .upsert(
        templates.map((t: { id: string }) => ({
          sku_product_id: accessoryId,
          template_id: t.id,
        })),
        { onConflict: "sku_product_id,template_id", ignoreDuplicates: true },
      );
  }
}

async function getFonedaySettings(): Promise<FonedaySettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "foneday")
    .single();
  return (data?.value as FonedaySettings) ?? { eur_dkk_rate: 745, in_stock_qty: 99 };
}

function eurToOere(priceEur: number, rate: number): number {
  // rate = DKK-per-EUR * 100, e.g. 745 = 7.45 DKK/EUR
  // Result: priceEur * rate = oere (e.g. 119.99 * 745 = 89,393 oere = 893.93 DKK)
  return Math.round(priceEur * rate);
}

export async function syncCatalog(): Promise<SyncStats> {
  const supabase = createAdminClient();
  const settings = await getFonedaySettings();
  clearMapCache();

  const stats: SyncStats = { synced: 0, new: 0, missing: 0, linked_updated: 0, errors: [] };

  // 1. Fetch all products from Foneday
  let products: FonedayProduct[];
  try {
    const response = await getProducts();
    products = response.products;
  } catch (err) {
    stats.errors.push(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return stats;
  }

  const now = new Date().toISOString();
  const fetchedSkus = new Set<string>();

  // Get existing SKUs before upsert to detect genuinely new products
  const { data: existingRows } = await supabase
    .from("foneday_catalog")
    .select("foneday_sku");
  const existingSkus = new Set((existingRows ?? []).map((r) => r.foneday_sku));

  // 2. Upsert products into foneday_catalog
  // Process in batches of 100 to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const rows = batch.map((p) => ({
      foneday_sku: p.sku,
      ean: p.ean,
      title: p.title,
      in_stock: p.instock === "Y",
      suitable_for: p.suitable_for,
      category: p.category,
      product_brand: p.product_brand,
      artcode: p.artcode,
      quality: p.quality,
      model_brand: p.model_brand,
      model_codes: p.model_codes ?? [],
      price_eur: p.price,
      price_dkk: eurToOere(p.price, settings.eur_dkk_rate),
      raw_data: p as unknown as Record<string, unknown>,
      missing_since: null, // clear missing flag
      last_synced_at: now,
      updated_at: now,
    }));

    const { error } = await supabase
      .from("foneday_catalog")
      .upsert(rows, { onConflict: "foneday_sku" });

    if (error) {
      stats.errors.push(`Upsert batch ${i}: ${error.message}`);
    } else {
      stats.synced += batch.length;
    }

    batch.forEach((p) => fetchedSkus.add(p.sku));
  }

  // Count genuinely new products by comparing against pre-sync SKU set
  stats.new = products.filter((p) => !existingSkus.has(p.sku)).length;

  // 3. Mark missing products
  // Products in our catalog that weren't in the API response
  const { data: allCatalog } = await supabase
    .from("foneday_catalog")
    .select("id, foneday_sku, missing_since")
    .is("missing_since", null);

  const missingRows = (allCatalog ?? []).filter((row) => !fetchedSkus.has(row.foneday_sku));
  if (missingRows.length > 0) {
    const { error } = await supabase
      .from("foneday_catalog")
      .update({ missing_since: now, in_stock: false, updated_at: now })
      .in("id", missingRows.map((r) => r.id));
    if (error) stats.errors.push(`Mark missing: ${error.message}`);
    stats.missing = missingRows.length;
  }

  // 4. Update linked retail sku_products
  const { data: skuLinks } = await supabase
    .from("foneday_sku_link")
    .select("*, foneday_catalog:foneday_catalog_id(*)")
    .eq("use_type", "retail")
    .not("sku_product_id", "is", null);

  for (const link of skuLinks ?? []) {
    const catalog = link.foneday_catalog as any;
    if (!catalog || !link.sku_product_id) continue;

    const updates: Record<string, unknown> = { updated_at: now };

    if (link.auto_sync_price) {
      const costDkk = eurToOere(catalog.price_eur, settings.eur_dkk_rate);
      const markup = Number(link.markup_percentage) || 0;
      const sellingPrice = Math.round(costDkk * (1 + markup / 100));
      updates.cost_price = costDkk;
      updates.selling_price = sellingPrice;
    }

    if (link.auto_sync_stock) {
      // For sku_products, update is_active based on stock status
      updates.is_active = catalog.in_stock;
      if (!catalog.in_stock) {
        updates.status = "draft";
      }
    }

    const { error } = await supabase
      .from("sku_products")
      .update(updates)
      .eq("id", link.sku_product_id);

    if (error) {
      stats.errors.push(`Update sku_product ${link.sku_product_id}: ${error.message}`);
    } else {
      stats.linked_updated++;
    }

    // Keep sku_product_templates in sync with Foneday compatibility data.
    await autoLinkTemplates(supabase, link.sku_product_id, link.foneday_catalog_id);
  }

  // 5. Archive stale sku_products (missing > 7 days with retail link)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleSkuLinks } = await supabase
    .from("foneday_sku_link")
    .select("sku_product_id, foneday_catalog:foneday_catalog_id(missing_since)")
    .eq("use_type", "retail")
    .not("sku_product_id", "is", null);

  for (const link of staleSkuLinks ?? []) {
    const catalog = link.foneday_catalog as any;
    if (!catalog?.missing_since || !link.sku_product_id) continue;
    if (catalog.missing_since < sevenDaysAgo) {
      await supabase
        .from("sku_products")
        .update({ status: "draft", is_active: false, updated_at: now })
        .eq("id", link.sku_product_id);
    }
  }

  return stats;
}
