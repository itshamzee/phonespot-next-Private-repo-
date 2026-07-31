import type { ShippingOption, ShippingMethod } from "./shipmondo/types";
import { CLICK_COLLECT_OPTIONS, CARRIER_PRODUCTS } from "./shipmondo/carriers";

/**
 * The one place shipping is priced.
 *
 * It used to live in four: this file, the checkout selector component, a second
 * unused selector, and the checkout session route. The price the customer saw
 * and the price they were charged came from different files, and removing DAO
 * here left it on the checkout page because that page never read this file.
 *
 * Prices are ours, not the carrier's. Shipmondo's rate is a cost, not a price,
 * so nothing here asks the API what to charge and the Stripe amount stays
 * predictable.
 */

/** Free over this, on the door option. Parcel shop is free regardless. */
export const FREE_SHIPPING_THRESHOLD = 50000; // 500 kr in øre

const SHIPPING_PRICES: Record<string, ShippingOption> = {
  pakkeshop: {
    method: "pakkeshop",
    label: "Afhent i pakkeshop",
    price: 0,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: true,
    // Carrier follows the shop the customer picks — see pickupCarrierProduct.
  },
  postnord: {
    method: "postnord",
    label: "Levering til døren",
    price: 3900,
    delivery_estimate: "2-4 hverdage",
    requires_pickup_point: false,
    ...CARRIER_PRODUCTS.postnord_home,
  },

  // Historical methods. Not offered, but an old order must still resolve to the
  // name and price it was placed with.
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
  gls_home: {
    method: "gls_home",
    label: "GLS - Levering til dør",
    price: 4900,
    delivery_estimate: "1-2 hverdage",
    requires_pickup_point: false,
    ...CARRIER_PRODUCTS.gls_home,
  },
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
};

/** What a customer can pick today. Everything else is history. */
const BOOKABLE: ShippingMethod[] = ["pakkeshop", "postnord"];

/** Carriers whose parcel shops are offered, cheapest handling first. */
export const PICKUP_CARRIERS = ["pdk", "gls"] as const;

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

/** The list price before any threshold or discount is applied. */
export function getShippingPrice(method: string): number | undefined {
  if (method === "free") return 0;
  if (method === "pickup_slagelse" || method === "pickup_vejle") return 0;
  return SHIPPING_PRICES[method]?.price ?? CLICK_COLLECT_OPTIONS.find((o) => o.method === method)?.price;
}

/** The product to book once the customer has chosen a shop. */
export function pickupCarrierProduct(carrierCode: string) {
  return carrierCode === "gls" ? CARRIER_PRODUCTS.gls_pickup : CARRIER_PRODUCTS.postnord_pickup;
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
