import { normalizeStoreId } from "@/lib/stores";

export interface StoreLocationConfig {
  slug: string;
  name: string;
  company: string;
  mall: string | null;
  street: string;
  city: string;
  zip: string;
  country: string;
  countryCode: string;
  phone: string;
  email: string;
  shopifyLocationId: string | null;
  hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  googleMapsUrl: string;
  googleMapsEmbed: string;
  coordinates: { lat: number; lng: number };
}

export const STORES: Record<string, StoreLocationConfig> = {
  slagelse: {
    slug: "slagelse",
    name: "PhoneSpot Slagelse",
    company: "PhoneSpot ApS",
    mall: "VestsjællandsCentret",
    street: "VestsjællandsCentret 10A, 103",
    city: "Slagelse",
    zip: "4200",
    country: "Danmark",
    countryCode: "DK",
    phone: "+45 61 10 00 48",
    email: "slagelse@phonespot.dk",
    shopifyLocationId: "90389381464",
    hours: {
      weekdays: "10:00 – 19:00",
      saturday: "10:00 – 17:00",
      sunday: "10:00 – 17:00",
    },
    // Intentionally NOT "street" (VestsjællandsCentret 10A, 103): Google's
    // text-search query is fuzzy on the mall name but breaks on the precise
    // entrance/unit suffix. Verified against a geocoder — "...10A, 103,
    // 4200 Slagelse" returns zero results, while "...10, 4200 Slagelse"
    // resolves fine near the mall. Keep this query mall-only so the pin
    // keeps resolving; the precise unit lives in `street` for copy/labels.
    googleMapsUrl:
      "https://maps.google.com/?q=VestsjællandsCentret+10,+4200+Slagelse",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2245.5!2d11.3531!3d55.4028!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x464d93d2c7b5c5a1%3A0x0!2sVestsj%C3%A6llandsCentret!5e0!3m2!1sda!2sdk!4v1",
    coordinates: { lat: 55.4028, lng: 11.3531 },
  },
  vejle: {
    slug: "vejle",
    name: "PhoneSpot Vejle",
    company: "PhoneSpot ApS",
    mall: null,
    street: "Løversysselvej 3B",
    city: "Vejle",
    zip: "7100",
    country: "Danmark",
    countryCode: "DK",
    phone: "+45 61 10 00 48",
    email: "vejle@phonespot.dk",
    shopifyLocationId: null,
    hours: {
      weekdays: "10:00 – 17:30",
      saturday: "10:00 – 15:00",
      sunday: "10:00 – 15:00",
    },
    googleMapsUrl:
      "https://maps.google.com/?q=Løversysselvej+3B,+7100+Vejle",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2240!2d9.5554!3d55.7076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x464c94f2a3b5c5a1%3A0x0!2sL%C3%B8versysselvej+3B!5e0!3m2!1sda!2sdk!4v1",
    coordinates: { lat: 55.7076, lng: 9.5554 },
  },
};

// Backwards compatibility
export const STORE = STORES.slagelse;

/**
 * The company-wide inbox, as opposed to a single store's.
 *
 * Anything that speaks for PhoneSpot as a whole — the footer, general contact
 * details — must use this rather than STORE.email, which is Slagelse's own
 * mailbox and stopped being the shared one when slagelse@ was created.
 */
export const COMPANY_EMAIL = "info@phonespot.dk";

/**
 * The store a record belongs to, for signing customer mail with the right
 * address. Falls back to Slagelse for records with no store — that is what
 * every one of these mails was hardcoded to before store attribution existed,
 * and the customer still has to be given an address to turn up at.
 */
export function storeForId(storeId?: string | null): StoreLocationConfig {
  const slug = normalizeStoreId(storeId);
  return slug ? STORES[slug] : STORE;
}
export type StoreConfig = StoreLocationConfig;

/** "10:00 – 19:00" (config format) → JSON-LD OpeningHoursSpecification entries. */
export function openingHoursJsonLd(hours: StoreLocationConfig["hours"]) {
  const span = (s: string) => {
    const [opens, closes] = s.split("–").map((t) => t.trim());
    return { opens, closes };
  };
  return [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], ...span(hours.weekdays) },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], ...span(hours.saturday) },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday"], ...span(hours.sunday) },
  ];
}
