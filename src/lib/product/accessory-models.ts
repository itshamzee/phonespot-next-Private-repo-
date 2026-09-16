import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import type { SpotVariantKind } from "@/lib/spot/types";

export function accessoryModelSlug(value: string): string {
  return TILBEHOER_DEVICES.find(model => model.label.toLowerCase() === value.toLowerCase() || model.slug === value)?.slug
    ?? value.toLowerCase().trim().replace(/\s+/g, "-");
}

export function accessoryModelLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((model): model is string => typeof model === "string").map(slug =>
    TILBEHOER_DEVICES.find(model => model.slug === slug)?.label ?? slug.replace(/-/g, " ")
  );
}

export function accessorySpotKind(product: { subcategory?: string | null; slug?: string | null; variant_label?: string | null }): SpotVariantKind | undefined {
  if (product.subcategory !== "spot-glass") return undefined;
  const value = `${product.variant_label ?? ""} ${product.slug ?? ""}`.toLowerCase();
  if (value.includes("privacy")) return "privacy";
  if (value.includes("plateau")) return "plateau";
  if (value.includes("lens")) return "lens";
  return "glass";
}
