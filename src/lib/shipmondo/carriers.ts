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
  gls_home: { carrier_code: "gls", product_code: "GLSDK_HD" },
  gls_pickup: { carrier_code: "gls", product_code: "GLSDK_SD" },
  postnord_home: { carrier_code: "pdk", product_code: "PDK_MH" },
  postnord_pickup: { carrier_code: "pdk", product_code: "PDK_MC" },
} as const;

export type CarrierProductKey = keyof typeof CARRIER_PRODUCTS;

/** These reject a booking without a chosen service point id. */
export const REQUIRES_SERVICE_POINT: string[] = ["PDK_MC", "GLSDK_SD"];

/**
 * The label a customer gets to send us a device for buyback.
 *
 * PDK_RDO is PostNord's return product: the customer hands the parcel in
 * anywhere, with no shop chosen up front. PDK_MC was tried first and rejected
 * the booking outright — "A service point is required for the product Service
 * Point" — which would have forced the customer to pick a specific shop before
 * we could even produce their label.
 */
export const BUYBACK_RETURN_PRODUCT = {
  carrier_code: "pdk",
  product_code: "PDK_RDO",
} as const;

/**
 * Codes the account cannot book. Named so a test fails if one is reintroduced —
 * they look plausible and were wrong for months.
 *
 * Check codes against `/products?sender_country_code=DK&receiver_country_code=DK`.
 * Without the country filter the API answers with a mixed international list
 * that omits DK products, which is how GLSDK_HD was briefly and wrongly retired.
 */
export const RETIRED_PRODUCT_CODES = ["PDK17", "PDK19", "PDKEP", "DAO_DIRECT"] as const;

/**
 * Where parcels come from and go back to. Derived from store-config rather than
 * repeated: the addresses used to be hardcoded here with two invented street
 * names that don't match either PhoneSpot location, so buyback return labels
 * were addressed to a street we are not at.
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

/**
 * Where buyback devices are sent. Every trade-in parcel goes to Vejle
 * regardless of which store the enquiry came in through — the assessment
 * happens in one place, so the label must too.
 */
export const BUYBACK_DESTINATION = SENDER_ADDRESSES.vejle;

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

/** PostNord and GLS both take the parcel number straight in the URL. */
export function trackingUrlFor(carrierCode: string, pkgNo: string): string {
  if (carrierCode === "gls") {
    return `https://gls-group.eu/DK/da/find-pakke?match=${encodeURIComponent(pkgNo)}`;
  }
  return `https://tracking.postnord.com/dk/?id=${encodeURIComponent(pkgNo)}`;
}
