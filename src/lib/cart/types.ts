// All monetary values in øre (DKK cents)

export type CartItemType = "device" | "sku_product";

/** Valgt RAM/SSD-opgradering på en laptop — prisen indgår i linjens total. */
export interface CartUpgradeSelection {
  optionId: string;
  kind: "ram" | "ssd";
  label: string;
  price: number;
}

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
  /** RAM/SSD-opgraderingstilvalg (kun laptops). Serverprisen validerer checkout. */
  upgrades?: CartUpgradeSelection[];
}

export interface CartSkuItem {
  type: "sku_product";
  skuProductId: string;
  title: string;
  image: string | null;
  price: number;
  /** Full (non-discounted) unit price in øre. Kun til visning — påvirker ikke længere totaler. */
  unitPrice?: number;
  quantity: number;
  variantLabel?: string; // e.g. "Farve: Sort" — shown in cart line item
  /** Spot-varianttype. Kun til visning — påvirker ikke længere totaler. */
  spotKind?: "glass" | "privacy" | "lens" | "plateau";
  /** Original retail price in øre — for strikethrough display when price is discounted. */
  retailPrice?: number;
  /** Cached at add-to-cart for display (iPhone web flow). */
  batteryHealth?: number;
  /** Lagersalgsvare (3 for 2). Sat ved læg-i-kurv, kun til visning — serveren regner selv. */
  lagersalg?: true;
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
  /** Lagersalg 3 for 2-besparelse. */
  bundleDiscountAmount: number;
  /** Antal lagersalgsvarer der mangler til næste gratis (1 eller 2), ellers null. */
  bundleUnitsToNextFree: number | null;
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
