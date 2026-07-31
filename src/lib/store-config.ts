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
    street: "VestsjællandsCentret 10",
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
    street: "Løversysselvej 3A",
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
      "https://maps.google.com/?q=Løversysselvej+3A,+7100+Vejle",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2240!2d9.5554!3d55.7076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x464c94f2a3b5c5a1%3A0x0!2sL%C3%B8versysselvej+3A!5e0!3m2!1sda!2sdk!4v1",
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
