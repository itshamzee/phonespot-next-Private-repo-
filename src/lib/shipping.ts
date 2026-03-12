import type { ShippingOption, ShippingMethod } from "./shipmondo/types";
import { CLICK_COLLECT_OPTIONS } from "./shipmondo/carriers";

const SHIPPING_PRICES: Record<string, ShippingOption> = {
  gls_home: {
    method: "gls_home",
    label: "GLS - Levering til dør",
    price: 4900,
    delivery_estimate: "1-2 hverdage",
    requires_pickup_point: false,
    carrier_code: "gls",
    product_code: "GLSDK_HD",
  },
  gls_pickup: {
    method: "gls_pickup",
    label: "GLS PakkeShop",
    price: 3900,
    delivery_estimate: "1-2 hverdage",
    requires_pickup_point: true,
    carrier_code: "gls",
    product_code: "GLSDK_SD",
  },
  postnord_home: {
    method: "postnord_home",
    label: "PostNord - Levering til dør",
    price: 5500,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: false,
    carrier_code: "postnord",
    product_code: "PDK17",
  },
  postnord_pickup: {
    method: "postnord_pickup",
    label: "PostNord Pakkeshop",
    price: 3900,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: true,
    carrier_code: "postnord",
    product_code: "PDK19",
  },
  dao_pickup: {
    method: "dao_pickup",
    label: "DAO Pakkeshop",
    price: 3500,
    delivery_estimate: "2-3 hverdage",
    requires_pickup_point: true,
    carrier_code: "dao",
    product_code: "DAO_DIRECT",
  },
};

export function getShippingOptions(): ShippingOption[] {
  return [...Object.values(SHIPPING_PRICES), ...CLICK_COLLECT_OPTIONS];
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
  return method.startsWith("click_collect_");
}
