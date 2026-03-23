// All monetary values in øre (DKK cents)

export type CartItemType = "device" | "sku_product";

export interface CartDeviceItem {
  type: "device";
  deviceId: string;
  templateId: string;
  title: string;
  grade: "A" | "B" | "C";
  color: string;
  storage: string;
  image: string | null;
  price: number;
  reservedAt: string;
  locationId?: string;
  locationName?: string;
}

export interface CartSkuItem {
  type: "sku_product";
  skuProductId: string;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
  variantLabel?: string; // e.g. "Farve: Sort" — shown in cart line item
}

export type CartItem = CartDeviceItem | CartSkuItem;

export function cartItemKey(item: CartItem): string {
  if (item.type === "device") return `device:${item.deviceId}`;
  // Include variant label in key so different variants of same product are separate cart items
  const variantSuffix = item.variantLabel ? `:${item.variantLabel}` : "";
  return `sku:${item.skuProductId}${variantSuffix}`;
}

export interface DiscountApplication {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  discountAmount: number;
}

export interface CartState {
  items: CartItem[];
  discount: DiscountApplication | null;
}

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  itemCount: number;
}

export type CartAction =
  | { type: "ADD_DEVICE"; item: CartDeviceItem }
  | { type: "ADD_SKU"; item: CartSkuItem }
  | { type: "REMOVE_ITEM"; key: string }
  | { type: "UPDATE_SKU_QUANTITY"; skuProductId: string; quantity: number }
  | { type: "APPLY_DISCOUNT"; discount: DiscountApplication }
  | { type: "REMOVE_DISCOUNT" }
  | { type: "CLEAR" };
