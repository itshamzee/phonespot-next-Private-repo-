import type { SkuProduct } from "@/lib/supabase/platform-types";
/** Explicit RSC allowlist: internal purchasing and supplier data stays on the server. */
export type PublicSkuProduct = Pick<SkuProduct,
  "id" | "title" | "description" | "selling_price" | "sale_price" | "brand" |
  "category" | "subcategory" | "images" | "short_description" | "slug" |
  "variants" | "attributes" | "always_in_stock"
>;
export function toPublicSkuProduct(product: PublicSkuProduct): PublicSkuProduct {
  return {
    id:product.id,title:product.title,description:product.description,
    selling_price:product.selling_price,sale_price:product.sale_price,brand:product.brand,
    category:product.category,subcategory:product.subcategory,images:[...product.images],
    short_description:product.short_description,slug:product.slug,always_in_stock:product.always_in_stock,
    variants:product.variants.map(variant=>({name:variant.name,options:variant.options.map(option=>({value:option.value,price_override:option.price_override,sku:option.sku,image:option.image}))})),
    attributes:product.attributes ? Object.fromEntries(Object.entries(product.attributes).filter(([key])=>!['_source','source','id','cost_price','supplier_id'].includes(key))) : undefined,
  };
}
