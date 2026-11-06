/**
 * Eksport til lagersystemets katalogimport og skiftedag (spec 2026-10-13 §6).
 *   npx tsx --env-file=.env.local scripts/export-spare-parts-for-lagersystem.ts --out <mappe>
 * Kør fra hovedcheckoutet (der hvor .env.local ligger). Skriver phonespot-reservedele.csv:
 * - alle reservedele (også deaktiverede) til match på model+kvalitet → part_aliases (system 'phonespot')
 * - slagelse_qty = OPENING for phonespot-slagelse; vejle_qty kun til info (hovedlageret
 *   tælles i Fixons system).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildCatalogRows, toCsv, type ProductIn } from "./lib/spare-parts-export";

const outIdx = process.argv.indexOf("--out");
const out = outIdx > -1 ? process.argv[outIdx + 1] : null;
if (!out) { console.error("Brug: --out <mappe>"); process.exit(1); }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  // PostgREST kapper svar ved 1000 rækker — hent i sider.
  const products: ProductIn[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("sku_products")
      .select("id, title, brand, device_model, product_number, ean, cost_price, spare_part_quality_tiers!quality_tier_id(name)")
      .or("subcategory.eq.spare-part,category.eq.spare-part")
      .order("title")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    products.push(...((data ?? []) as unknown as ProductIn[]));
    if ((data ?? []).length < 1000) break;
  }

  const { data: locs, error: locErr } = await sb.from("locations").select("id, name").in("name", ["Slagelse", "Vejle"]);
  if (locErr) throw locErr;
  const slagelseId = locs?.find((l) => l.name === "Slagelse")?.id;
  const vejleId = locs?.find((l) => l.name === "Vejle")?.id;

  const ids = products.map((p) => p.id);
  const stock = new Map<string, { slagelse: number; vejle: number }>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error: sErr } = await sb.from("sku_stock").select("product_id, location_id, quantity").in("product_id", ids.slice(i, i + 100));
    if (sErr) throw sErr;
    for (const s of data ?? []) {
      const cur = stock.get(s.product_id) ?? { slagelse: 0, vejle: 0 };
      if (s.location_id === slagelseId) cur.slagelse += s.quantity;
      if (s.location_id === vejleId) cur.vejle += s.quantity;
      stock.set(s.product_id, cur);
    }
  }

  const rows = buildCatalogRows(products, stock);
  mkdirSync(out!, { recursive: true });
  writeFileSync(join(out!, "phonespot-reservedele.csv"), toCsv(rows as unknown as Record<string, string | number | null>[]), "utf8");
  console.log(`Skrev ${rows.length} reservedele; ${rows.filter((r) => r.slagelse_qty > 0).length} med Slagelse-lager.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
