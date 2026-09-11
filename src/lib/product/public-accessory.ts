/** Public listing fields. Stock quantities partition stores and other locations. */
export type AccessoryAvailability = "in_stock" | "orderable" | "out_of_stock" | "unknown";
export interface PublicAccessory {
  id: string; name: string; slug: string | null; category: string; brand: string | null;
  price: number; sale_price: number | null; image_url: string | null; created_at: string;
  store_stock: number | null; online_stock: number | null; availability: AccessoryAvailability;
}
export interface AccessoryStockRow { product_id: string; quantity: number; location: { type: string } | null }
