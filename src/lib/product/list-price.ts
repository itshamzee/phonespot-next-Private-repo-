/**
 * Vejledende udsalgspris (attribut vejl_pris, i kr.) på ægte mærkevarer på
 * lagersalg. Besparelsen må kun vises op mod en dokumenteret vejledende pris,
 * aldrig som "før"-pris (30-dages-reglen), og kun når den er mindst 10 %.
 */
export function parseListPriceKr(attributes: Record<string, string> | null | undefined): number | null {
  const raw = attributes?.vejl_pris?.replace(/[^\d]/g, "");
  const kr = raw ? Number(raw) : NaN;
  return Number.isFinite(kr) && kr > 0 ? kr : null;
}

export function listPriceSaving(listPriceKr: number | null, priceOere: number): number | null {
  if (!listPriceKr) return null;
  const pct = Math.round((1 - priceOere / 100 / listPriceKr) * 100);
  return pct >= 10 ? pct : null;
}
