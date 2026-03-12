import type { ShippingOption } from "./types";

export const DEFAULT_PARCEL = {
  weight: 500,
  length: 25,
  width: 20,
  height: 10,
} as const;

export const CARRIER_PRODUCTS = {
  gls_home: { carrier_code: "gls", product_code: "GLSDK_HD" },
  gls_pickup: { carrier_code: "gls", product_code: "GLSDK_SD" },
  postnord_home: { carrier_code: "postnord", product_code: "PDK17" },
  postnord_pickup: { carrier_code: "postnord", product_code: "PDK19" },
  dao_pickup: { carrier_code: "dao", product_code: "DAO_DIRECT" },
} as const;

export const SENDER_ADDRESSES = {
  slagelse: {
    name: "PhoneSpot",
    address1: "Løvegade 12",
    zipcode: "4200",
    city: "Slagelse",
    country_code: "DK",
    email: "info@phonespot.dk",
    phone: "71994848",
  },
  vejle: {
    name: "PhoneSpot",
    address1: "Nørregade 22",
    zipcode: "7100",
    city: "Vejle",
    country_code: "DK",
    email: "info@phonespot.dk",
    phone: "71994848",
  },
} as const;

export const CLICK_COLLECT_OPTIONS: ShippingOption[] = [
  {
    method: "click_collect_slagelse",
    label: "Afhent i Slagelse",
    price: 0,
    delivery_estimate: "Klar inden for 1 hverdag",
    requires_pickup_point: false,
  },
  {
    method: "click_collect_vejle",
    label: "Afhent i Vejle",
    price: 0,
    delivery_estimate: "Klar inden for 1 hverdag",
    requires_pickup_point: false,
  },
];
