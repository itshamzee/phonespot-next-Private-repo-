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
  /** If set, customer paid the +300 kr 100% battery upgrade for this device (POS flow only). */
  batteryUpgrade?: { priceOere: number };
  /** Cached at add-time for display. */
  batteryHealth?: number;
}

export interface CartSkuItem {
  type: "sku_product";
  skuProductId: string;
  title: string;
  image: string | null;
  price: number;
  /** Full (non-discounted) unit price in øre. Only set for Spot items where price reflects a sale. */
  unitPrice?: number;
  quantity: number;
  variantLabel?: string; // e.g. "Farve: Sort" — shown in cart line item
  /** Present on Spot beskyttelsesglas items to enable bundle-pricing rules. */
  spotKind?: "glass" | "privacy" | "lens" | "plateau";
  /** When set, item was auto-added by a campaign and must not be removable independently. */
  bundleAttached?: {
    campaignId: "sommer-bundle-2026";
    /** cartItemKey of the parent SKU/device the bundle is locked to. */
    parentItemKey: string;
  };
  /** Original retail price in øre — for strikethrough display when price is 0 or discounted. */
  retailPrice?: number;
  /** If true, this SKU represents the iPhone parent in the web flow and carries a battery upgrade. */
  batteryUpgrade?: { priceOere: number };
  /** Cached at add-to-cart for display (iPhone web flow). */
  batteryHealth?: number;
  /** Set to "battery-upgrade" when this SKU line IS the battery upgrade fee itself. */
  kind?: "battery-upgrade";
  /** When kind = "battery-upgrade", the cartItemKey of the parent iPhone SKU/device. */
  upgradeParentItemKey?: string;
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
  /** Spot 3-for-2 + Lens combo savings (already existed). */
  bundleDiscountAmount: number;
  /** NEW: Sommer Bundle savings — sum of retailPrice across bundleAttached items. */
  bundleSavingsAmount: number;
  shippingCost: number;
  total: number;
  itemCount: number;
}

export type CartAction =
  | { type: "ADD_DEVICE"; item: CartDeviceItem }
  | { type: "ADD_SKU"; item: CartSkuItem }
  | { type: "ADD_IPHONE_WITH_BUNDLE"; iphone: CartSkuItem; glass: CartSkuItem; tpu: CartSkuItem; batteryUpgrade?: CartSkuItem }
  | { type: "REMOVE_ITEM"; key: string }
  | { type: "UPDATE_SKU_QUANTITY"; skuProductId: string; quantity: number }
  | { type: "APPLY_DISCOUNT"; discount: DiscountApplication }
  | { type: "REMOVE_DISCOUNT" }
  | { type: "CLEAR" };
