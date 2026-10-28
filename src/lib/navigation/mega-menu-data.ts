import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { LAPTOP_TIERS } from "@/lib/laptop-tiers";
import { buildMegaMenu, type MegaMenu, type MenuTemplate } from "./mega-menu";

const CATEGORIES = ["iphone", "smartphone", "ipad", "laptop", "smartwatch"];

async function loadMegaMenu(): Promise<MegaMenu | null> {
  try {
    const supabase = createAdminClient();
    const { data: templates, error } = await supabase
      .from("product_templates")
      .select("id, category, brand, display_name, slug, images")
      .eq("status", "published")
      .in("category", CATEGORIES);
    if (error || !templates?.length) return null;

    const { data: devices, error: deviceError } = await supabase
      .from("devices")
      .select("template_id, selling_price")
      .eq("status", "listed")
      .in("template_id", templates.map((t) => t.id));
    if (deviceError) return null;

    const stats = new Map<string, { stock: number; min: number }>();
    for (const d of devices ?? []) {
      if (!d.selling_price) continue;
      const s = stats.get(d.template_id) ?? { stock: 0, min: Infinity };
      stats.set(d.template_id, { stock: s.stock + 1, min: Math.min(s.min, d.selling_price) });
    }

    const rows: MenuTemplate[] = templates
      .filter((t) => t.slug && stats.has(t.id))
      .map((t) => ({
        category: t.category,
        brand: t.brand,
        display_name: t.display_name,
        slug: t.slug,
        image: Array.isArray(t.images) ? (t.images[0] ?? null) : null,
        minPriceOre: stats.get(t.id)!.min,
        stock: stats.get(t.id)!.stock,
      }));

    return buildMegaMenu(rows, LAPTOP_TIERS.map((t) => ({ slug: t.slug, title: t.title, tagline: t.tagline })));
  } catch {
    // Menuen må aldrig vælte en side; uden data vises de almindelige kategorilinks.
    return null;
  }
}

/** Hovedmenuens paneler, gemt i 10 minutter, så hver side ikke spørger databasen. */
export const getMegaMenu = unstable_cache(loadMegaMenu, ["mega-menu-v1"], { revalidate: 600 });
