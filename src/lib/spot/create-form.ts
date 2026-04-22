import { SPOT_VARIANT_DEFAULTS, type SpotVariantKind } from "./types";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

export interface ComputeRowsInput {
  variant: SpotVariantKind;
  colors: string[];
  models: string[];
  mode: "universal" | "per-model";
  priceOere: number;
  images: string[];
}

export interface SpotRowCreate {
  title: string;
  slug: string;
  variant_label: string;
  variant_sort: number;
  selling_price: number;
  sale_price: number | null;
  compatible_models: string[];
  images: string[];
}

export interface ComputedGroup {
  variant_group: string;
  rows: SpotRowCreate[];
}

export function computeRows(input: ComputeRowsInput): ComputedGroup[] {
  const { variant, colors, models, mode, priceOere, images } = input;

  if (variant === "plateau") {
    return models.map(m => ({
      variant_group: `spot-plateau-${m}`,
      rows: colors.map((color, idx) => ({
        title: `Spot Plateau — ${labelFor(m)} — ${color}`,
        slug: makeSlug(["spot","plateau", m, color]),
        variant_label: color,
        variant_sort: idx + 1,
        selling_price: priceOere,
        sale_price: null,
        compatible_models: [m],
        images,
      })),
    }));
  }

  if (mode === "universal") {
    const sortedModels = [...models].sort();
    const group = `spot-${variant}-${sortedModels.join("-")}`;
    return [{
      variant_group: group,
      rows: [{
        title: `Spot ${capitalize(variant)} — ${sortedModels.map(labelFor).join("/")}`,
        slug: makeSlug(["spot", variant, ...sortedModels]),
        variant_label: SPOT_VARIANT_DEFAULTS[variant].label,
        variant_sort: 1,
        selling_price: priceOere,
        sale_price: null,
        compatible_models: sortedModels,
        images,
      }],
    }];
  }

  return models.map(m => ({
    variant_group: `spot-${variant}-${m}`,
    rows: [{
      title: `Spot ${capitalize(variant)} — ${labelFor(m)}`,
      slug: makeSlug(["spot", variant, m]),
      variant_label: SPOT_VARIANT_DEFAULTS[variant].label,
      variant_sort: 1,
      selling_price: priceOere,
      sale_price: null,
      compatible_models: [m],
      images,
    }],
  }));
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function labelFor(modelSlug: string) {
  return TILBEHOER_DEVICES.find(d => d.slug === modelSlug)?.label ?? modelSlug;
}

function makeSlug(parts: string[]): string {
  return parts
    .map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("-");
}
