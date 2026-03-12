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
}

export interface CartSkuItem {
  type: "sku_product";
  skuProductId: string;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
}

export type CartItem = CartDeviceItem | CartSkuItem;

export function cartItemKey(item: CartItem): string {
  return item.type === "device" ? `device:${item.deviceId}` : `sku:${item.skuProductId}`;
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
