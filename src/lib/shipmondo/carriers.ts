import type { ShippingOption } from "./types";
import { STORES } from "@/lib/store-config";

export const DEFAULT_PARCEL = {
  weight: 500,
  length: 25,
  width: 20,
  height: 10,
} as const;

/**
 * Carrier and product codes, checked against what the Shipmondo account can
 * actually book (GET /carriers and GET /products, 2026-07-31).
 *
 * The codes that used to live here — PDK17, PDK19, PDKEP, GLSDK_HD,
 * DAO_DIRECT — exist on none of them, and the carrier was written "postnord"
 * where Shipmondo calls it "pdk". Every label booking would have been rejected
 * even once the API keys were in place.
 *
 * The account has no DAO agreement and no GLS home-delivery product, so those
 * two options are gone rather than left to fail at booking time.
 */
export const CARRIER_PRODUCTS = {
  gls_pickup: { carrier_code: "gls", product_code: "GLSDK_SD" },
  postnord_home: { carrier_code: "pdk", product_code: "PDK_MH" },
  postnord_pickup: { carrier_code: "pdk", product_code: "PDK_MC" },
} as const;

export type CarrierProductKey = keyof typeof CARRIER_PRODUCTS;

/**
 * What a customer sending us a device for buyback drops off with. A service
 * point product, because the customer has to hand the parcel in somewhere.
 */
export const BUYBACK_RETURN_PRODUCT = CARRIER_PRODUCTS.postnord_pickup;

/**
 * Codes removed because the account cannot book them. Named so a test can fail
 * if one is reintroduced — they look plausible and were wrong for months.
 */
export const RETIRED_PRODUCT_CODES = [
  "PDK17",
  "PDK19",
  "PDKEP",
  "GLSDK_HD",
  "DAO_DIRECT",
] as const;

/**
 * Where parcels come from and go back to. Derived from store-config rather than
 * repeated: the copies here said Løvegade 12 and Nørregade 22, neither of which
 * is a PhoneSpot address, so buyback return labels were addressed to a street we
 * are not at.
 */
function senderFor(slug: "slagelse" | "vejle") {
  const store = STORES[slug];
  return {
    name: store.name,
    address1: store.street,
    zipcode: store.zip,
    city: store.city,
    country_code: store.countryCode,
    email: store.email,
    phone: store.phone.replace(/[^0-9]/g, "").replace(/^45/, ""),
  };
}

export const SENDER_ADDRESSES = {
  slagelse: senderFor("slagelse"),
  vejle: senderFor("vejle"),
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
