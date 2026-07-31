import type { ShippingOption, ShippingMethod } from "./shipmondo/types";
import { CLICK_COLLECT_OPTIONS, CARRIER_PRODUCTS } from "./shipmondo/carriers";

/**
 * Every shipping method we have ever sold, so an old order still renders the
 * name and price it was placed with.
 *
 * What a customer can *choose today* is the smaller set in BOOKABLE — the
 * account has no DAO agreement and no GLS home-delivery product, so offering
 * them only produces a booking that fails after the customer has paid.
 */
const SHIPPING_PRICES: Record<string, ShippingOption> = {
  // Checkout uses these simplified IDs
  postnord: {
    method: "postnord",
    label: "PostNord Levering",
    price: 5900,
    delivery_estimate: "2-4 hverdage",
    requires_pickup_point: false,
    ...CARRIER_PRODUCTS.postnord_home,
  },
  postnord_pickup: {
    method: "postnord_pickup",
    label: "PostNord Pakkeshop",
    price: 3900,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: true,
    ...CARRIER_PRODUCTS.postnord_pickup,
  },
  gls_pickup: {
    method: "gls_pickup",
    label: "GLS PakkeShop",
    price: 3900,
    delivery_estimate: "1-2 hverdage",
    requires_pickup_point: true,
    ...CARRIER_PRODUCTS.gls_pickup,
  },

  // Legacy keys — kept so historical orders still resolve to a name and price.
  // Not offered at checkout; see BOOKABLE below.
  postnord_home: {
    method: "postnord_home",
    label: "PostNord - Levering til dør",
    price: 5500,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: false,
    ...CARRIER_PRODUCTS.postnord_home,
  },
  dao: {
    method: "dao",
    label: "DAO Pakke",
    price: 4900,
    delivery_estimate: "2-4 hverdage",
    requires_pickup_point: true,
  },
  dao_pickup: {
    method: "dao_pickup",
    label: "DAO Pakkeshop",
    price: 3500,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: true,
  },
  gls_home: {
    method: "gls_home",
    label: "GLS - Levering til dør",
    price: 4900,
    delivery_estimate: "1-2 hverdage",
    requires_pickup_point: false,
  },
};

/** What a customer can pick today. Everything else is history. */
const BOOKABLE: ShippingMethod[] = ["postnord", "postnord_pickup", "gls_pickup"];

export function getShippingOptions(): ShippingOption[] {
  const bookable = BOOKABLE.map((m) => SHIPPING_PRICES[m]).filter(Boolean);
  return [...bookable, ...CLICK_COLLECT_OPTIONS];
}

export function getShippingOption(method: ShippingMethod): ShippingOption | undefined {
  if (method.startsWith("click_collect_")) {
    return CLICK_COLLECT_OPTIONS.find((o) => o.method === method);
  }
  return SHIPPING_PRICES[method];
}

export function getDispatchLocation(
  deviceLocationId: string | null,
  locationMap: Record<string, string>
): "slagelse" | "vejle" {
  if (deviceLocationId && locationMap[deviceLocationId]) {
    return locationMap[deviceLocationId] as "slagelse" | "vejle";
  }
  return "slagelse";
}

export function isClickCollect(method: ShippingMethod): boolean {
  return method.startsWith("click_collect_") || method.startsWith("pickup_");
}
