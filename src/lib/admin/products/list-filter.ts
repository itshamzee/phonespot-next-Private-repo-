/**
 * Filtrene på admin-listerne over tilbehør og reservedele (viewet
 * checkout_sku_inventory). Deles af listen og masseændringen, så "alle der
 * matcher" altid er præcis de produkter, listen viser.
 */
export interface ProductListFilter {
  type: "accessory" | "spare-part";
  search?: string;
  subcategory?: string;
  brand?: string;
  status?: string | null;
  stock?: string | null;
}

export function applyProductListFilter<Q>(query: Q, filter: ProductListFilter): Q {
  // Supabase' filterbygger er generisk pr. tabel; her bruges kun de fælles filtermetoder.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  const search = filter.search?.trim() ?? "";
  const subcategory = filter.subcategory?.trim() ?? "";
  const brand = filter.brand?.trim() ?? "";

  q = q.eq("category", filter.type);
  if (filter.type === "accessory") q = q.neq("subcategory", "spare-part");
  if (search) {
    const safe = search.replace(/[%,]/g, " ");
    q = q.or(`title.ilike.%${safe}%,brand.ilike.%${safe}%`);
  }
  if (subcategory) q = q.eq("subcategory", subcategory);
  if (brand) q = q.ilike("brand", brand);
  if (filter.status === "published" || filter.status === "draft") q = q.eq("status", filter.status);
  if (filter.stock === "in") q = q.gt("total_stock", 0);
  else if (filter.stock === "out") q = q.eq("total_stock", 0).eq("always_in_stock", false);
  else if (filter.stock === "order") q = q.eq("always_in_stock", true);
  return q as Q;
}
