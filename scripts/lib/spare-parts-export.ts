export type ProductIn = {
  id: string; title: string; brand: string | null; device_model: string | null; product_number: string | null;
  ean: string | null; cost_price: number | null; spare_part_quality_tiers: { name: string } | null;
};
export type CatalogRow = {
  phonespot_id: string; title: string; brand: string | null; device_model: string | null; quality: string | null;
  product_number: string | null; ean: string | null; cost_price_ore: number | null; slagelse_qty: number; vejle_qty: number;
};

export function buildCatalogRows(products: ProductIn[], stockByProduct: Map<string, { slagelse: number; vejle: number }>): CatalogRow[] {
  return products.map((p) => ({
    phonespot_id: p.id,
    title: p.title,
    brand: p.brand,
    device_model: p.device_model,
    quality: p.spare_part_quality_tiers?.name ?? null,
    product_number: p.product_number,
    ean: p.ean,
    cost_price_ore: p.cost_price,
    slagelse_qty: stockByProduct.get(p.id)?.slagelse ?? 0,
    vejle_qty: stockByProduct.get(p.id)?.vejle ?? 0,
  }));
}

export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n") + "\n";
}
