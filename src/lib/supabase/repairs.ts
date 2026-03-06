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

export async function getBrandBySlug(slug: string): Promise<RepairBrand | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_brands")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();
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
  const { data } = await supabase
    .from("repair_models")
    .select("*")
    .eq("brand_id", brandId)
    .eq("slug", modelSlug)
    .eq("active", true)
    .single();
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
