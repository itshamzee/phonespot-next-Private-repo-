/**
 * featured-product.ts
 *
 * Server-side helper that resolves the active featured product template
 * (highest priority within time bounds) and enriches it with derived
 * fromPrice, stockCount, topGrade, etc.
 *
 * Falls back to "latest in-stock iPhone Pro" when no active feature exists.
 * Returns null only when both queries fail entirely.
 *
 * Wrapped with unstable_cache (5-minute revalidation, 'featured-product' tag).
 */

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase/client';
import type { ProductTemplate, Device, DeviceGrade } from '@/lib/supabase/platform-types';

// ---------------------------------------------------------------------------
// Public type contract
// ---------------------------------------------------------------------------

export type FeaturedProduct = {
  template: {
    id: string;
    slug: string;
    displayName: string;
    brand: string;
    image: string | null;
    color: string | null;
    storage: string | null;
  };
  fromPrice: number;            // DKK whole kroner
  originalPrice: number | null; // for strikethrough; from template.default_attributes.original_price if present
  savings: number | null;       // originalPrice - fromPrice when both known
  stockCount: number;
  topGrade: 'A' | 'B' | 'C' | null;
  isFallback: boolean;
};

// ---------------------------------------------------------------------------
// Grade ordering helper
// ---------------------------------------------------------------------------

const GRADE_ORDER: DeviceGrade[] = ['A', 'B', 'C', 'P', 'N'];

function bestGrade(grades: DeviceGrade[]): 'A' | 'B' | 'C' | null {
  for (const g of GRADE_ORDER) {
    if (grades.includes(g) && (g === 'A' || g === 'B' || g === 'C')) {
      return g as 'A' | 'B' | 'C';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// enrichWithStock — shared enrichment logic
// ---------------------------------------------------------------------------

async function enrichWithStock(
  template: ProductTemplate,
  isFallback: boolean,
): Promise<FeaturedProduct | null> {
  const supabase = createServerClient();

  const { data: devices, error } = await supabase
    .from('devices')
    .select('id, grade, selling_price, storage, color')
    .eq('template_id', template.id)
    .eq('status', 'listed')
    .in('grade', ['A', 'B', 'C']);

  if (error || !devices || devices.length === 0) {
    return null;
  }

  // fromPrice: lowest selling_price in øre → DKK whole kroner
  const listed = devices as Pick<Device, 'id' | 'grade' | 'selling_price' | 'storage' | 'color'>[];
  const minPriceOere = Math.min(...listed.map((d) => d.selling_price ?? Infinity));
  if (!isFinite(minPriceOere)) return null;

  const fromPrice = Math.round(minPriceOere / 100);
  const stockCount = listed.length;
  const grades = listed.map((d) => d.grade as DeviceGrade);
  const topGrade = bestGrade(grades);

  // The device with the lowest price — use its color/storage for display
  const cheapest = listed.find((d) => d.selling_price === minPriceOere);

  // originalPrice from default_attributes.original_price (already in whole kroner)
  const attrs = template.default_attributes as Record<string, unknown>;
  const originalPrice =
    typeof attrs?.original_price === 'number' ? attrs.original_price : null;

  const savings =
    originalPrice !== null ? originalPrice - fromPrice : null;

  return {
    template: {
      id: template.id,
      slug: template.slug,
      displayName: template.display_name,
      brand: template.brand,
      image: template.images?.[0] ?? null,
      color: cheapest?.color ?? null,
      storage: cheapest?.storage ?? null,
    },
    fromPrice,
    originalPrice,
    savings: savings !== null && savings > 0 ? savings : null,
    stockCount,
    topGrade,
    isFallback,
  };
}

// ---------------------------------------------------------------------------
// fetchActiveFeatured
// ---------------------------------------------------------------------------

async function fetchActiveFeatured(): Promise<FeaturedProduct | null> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: template, error } = await supabase
    .from('product_templates')
    .select('*')
    .not('featured_priority', 'is', null)
    .or(`featured_starts_at.is.null,featured_starts_at.lte.${now}`)
    .or(`featured_ends_at.is.null,featured_ends_at.gte.${now}`)
    .order('featured_priority', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !template) return null;

  return enrichWithStock(template as ProductTemplate, false);
}

// ---------------------------------------------------------------------------
// fetchFallback — latest in-stock Apple iPhone Pro
// ---------------------------------------------------------------------------

async function fetchFallback(): Promise<FeaturedProduct | null> {
  const supabase = createServerClient();

  const { data: template, error } = await supabase
    .from('product_templates')
    .select('*')
    .eq('brand', 'Apple')
    .ilike('display_name', '%Pro%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !template) return null;

  return enrichWithStock(template as ProductTemplate, true);
}

// ---------------------------------------------------------------------------
// _getFeaturedProductUncached — exported for testing (bypasses cache)
// ---------------------------------------------------------------------------

export async function _getFeaturedProductUncached(): Promise<FeaturedProduct | null> {
  try {
    const active = await fetchActiveFeatured();
    if (active !== null) return active;

    const fallback = await fetchFallback();
    return fallback;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// getFeaturedProduct — cache-wrapped export for production use
// ---------------------------------------------------------------------------

export const getFeaturedProduct = unstable_cache(
  _getFeaturedProductUncached,
  ['featured-product-v1'],
  { revalidate: 300, tags: ['featured-product'] },
);
