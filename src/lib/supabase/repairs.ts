import { createServerClient } from "./client";
import type { RepairBrand, RepairModel, RepairService } from "./types";

export async function getActiveBrands(): Promise<RepairBrand[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_brands")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  return (data as RepairBrand[]) ?? [];
}

// Brand-/modelopslag skelner mellem "findes ikke" og "databasen svarede ikke".
// Siderne kalder notFound() på null, og notFound under prerender/ISR caches
// som 404 i op til en time — en forbigående fejl må derfor kaste i stedet.
export async function getBrandBySlug(slug: string): Promise<RepairBrand | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_brands")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as RepairBrand | null) ?? null;
}

export async function getModelsByBrand(brandId: string): Promise<RepairModel[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_models")
    .select("*")
    .eq("brand_id", brandId)
    .eq("active", true)
    .order("sort_order");
  return (data as RepairModel[]) ?? [];
}

export async function getModelBySlug(brandId: string, modelSlug: string): Promise<RepairModel | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_models")
    .select("*")
    .eq("brand_id", brandId)
    .eq("slug", modelSlug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as RepairModel | null) ?? null;
}

export async function getServicesByModel(modelId: string): Promise<RepairService[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_services")
    .select("*")
    .eq("model_id", modelId)
    .eq("active", true)
    .order("sort_order");
  return (data as RepairService[]) ?? [];
}

export async function getCheapestPrice(modelId: string): Promise<number | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_services")
    .select("price_dkk")
    .eq("model_id", modelId)
    .eq("active", true)
    .gt("price_dkk", 0)
    .order("price_dkk", { ascending: true })
    .limit(1)
    .single();
  return data?.price_dkk ?? null;
}

export async function getAllBrandSlugs(): Promise<string[]> {
  const brands = await getActiveBrands();
  return brands.map((b) => b.slug);
}

export async function getAllModelsWithBrand(): Promise<
  (RepairModel & { brand_slug: string; brand_name: string })[]
> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_models")
    .select("*, repair_brands!inner(slug, name)")
    .eq("active", true)
    .order("sort_order");
  if (!data) return [];
  return data.map((row: any) => ({
    ...row,
    brand_slug: row.repair_brands.slug,
    brand_name: row.repair_brands.name,
    repair_brands: undefined,
  }));
}

export async function getAllModelSlugs(): Promise<{ brand: string; model: string }[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_models")
    .select("slug, repair_brands!inner(slug)")
    .eq("active", true);
  if (!data) return [];
  return data.map((row: any) => ({
    brand: row.repair_brands.slug,
    model: row.slug,
  }));
}

export type RepairPriceSummary = {
  brandSlug: string;
  modelSlug: string;
  modelName: string;
  screenFrom: number | null;
  screenOriginal: number | null;
  battery: number | null;
};

// Prisoversigt til lokale landingssider: billigste skærm, original skærm og
// batteri pr. model. Rækkefølgen følger `models`, og modeller uden priser
// udelades, så tabellen aldrig viser tomme rækker.
export async function getRepairPriceSummaries(
  models: { brand: string; model: string }[],
): Promise<RepairPriceSummary[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_models")
    .select(
      "slug, name, repair_brands!inner(slug), repair_services(price_dkk, service_category, quality_tier, active)",
    )
    .eq("active", true)
    .in("slug", models.map((m) => m.model));
  if (!data) return [];

  type PriceRow = {
    slug: string;
    name: string;
    repair_brands: { slug: string };
    repair_services: Pick<RepairService, "price_dkk" | "service_category" | "quality_tier" | "active">[];
  };
  const rows = data as unknown as PriceRow[];
  return models.flatMap(({ brand, model }) => {
    const row = rows.find((r) => r.slug === model && r.repair_brands.slug === brand);
    if (!row) return [];
    const services = row.repair_services.filter((s) => s.active && s.price_dkk > 0);
    const screens = services.filter((s) => s.service_category === "Skærmskift");
    const batteries = services.filter((s) => s.service_category === "Batteriskift");
    const min = (list: typeof services) =>
      list.length > 0 ? Math.min(...list.map((s) => s.price_dkk)) : null;
    const summary: RepairPriceSummary = {
      brandSlug: brand,
      modelSlug: model,
      modelName: row.name,
      screenFrom: min(screens),
      screenOriginal: min(screens.filter((s) => s.quality_tier === "original")),
      battery: min(batteries),
    };
    return summary.screenFrom || summary.battery ? [summary] : [];
  });
}
