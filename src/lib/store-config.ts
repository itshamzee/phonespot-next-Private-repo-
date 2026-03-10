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
    phone: "+45 XX XX XX XX",
    email: "info@phonespot.dk",
    shopifyLocationId: "90389381464",
    hours: {
      weekdays: "10:00 – 18:00",
      saturday: "10:00 – 16:00",
      sunday: "Lukket",
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
    street: "TBD",
    city: "Vejle",
    zip: "7100",
    country: "Danmark",
    countryCode: "DK",
    phone: "+45 XX XX XX XX",
    email: "vejle@phonespot.dk",
    shopifyLocationId: null,
    hours: {
      weekdays: "10:00 – 18:00",
      saturday: "10:00 – 16:00",
      sunday: "Lukket",
    },
    googleMapsUrl: "https://maps.google.com/?q=Vejle",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=TBD",
    coordinates: { lat: 55.7113, lng: 9.5357 },
  },
};

// Backwards compatibility
export const STORE = STORES.slagelse;
export type StoreConfig = StoreLocationConfig;
