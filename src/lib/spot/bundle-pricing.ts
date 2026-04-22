export interface CartLine {
  sku: string;
  kind: "glass" | "privacy" | "lens" | "plateau" | "other";
  unit_price_oere: number;
  sale_price_oere: number | null;
  quantity: number;
  is_spot: boolean;
}

export interface CartLineWithDiscount extends CartLine {
  discount_oere: number;
  reason: string | null;
}

/**
 * Apply Spot bundle pricing rules. Pure — no side effects, no DB access.
 * See docs/superpowers/specs/2026-04-22-spot-beskyttelsesglas-design.md §11.9.
 *
 * Rules:
 *  1. 3-for-2 per Spot SKU: floor(qty/3) units free. Suppressed when sale_price is set.
 *  2. Lens 50% off per Glass/Privacy unit in cart. Matched pairs = min(totalGlassQty, totalLensQty).
 *  3. Rules stack: a line can get both 3-for-2 and Lens combo discounts.
 */
export function applyBundleDiscounts(lines: CartLine[]): CartLineWithDiscount[] {
  const out: CartLineWithDiscount[] = lines.map(l => ({ ...l, discount_oere: 0, reason: null }));

  // Rule 1 — 3-for-2 per Spot glass/privacy SKU (suppressed when sale_price is set)
  for (const line of out) {
    if (!line.is_spot) continue;
    if (line.kind !== "glass" && line.kind !== "privacy") continue;
    if (line.sale_price_oere != null) continue;
    const freeUnits = Math.floor(line.quantity / 3);
    if (freeUnits > 0) {
      line.discount_oere += freeUnits * line.unit_price_oere;
      line.reason = `${freeUnits}× gratis (3-for-2 rabat)`;
    }
  }

  // Rule 2 — Lens 50% off per Glass/Privacy unit in cart
  const glassCount = out
    .filter(l => l.is_spot && (l.kind === "glass" || l.kind === "privacy"))
    .reduce((n, l) => n + l.quantity, 0);

  if (glassCount > 0) {
    let remaining = glassCount;
    for (const line of out) {
      if (!line.is_spot || line.kind !== "lens" || remaining <= 0) continue;
      const eligibleUnits = Math.min(remaining, line.quantity);
      const effectiveUnitPrice = line.sale_price_oere ?? line.unit_price_oere;
      const perUnitDiscount = Math.round(effectiveUnitPrice / 2);
      line.discount_oere += perUnitDiscount * eligibleUnits;
      const prefix = line.reason ? `${line.reason} + ` : "";
      line.reason = `${prefix}Lens combo ${eligibleUnits}× 50% off`;
      remaining -= eligibleUnits;
    }
  }

  return out;
}
