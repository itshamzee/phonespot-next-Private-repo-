import { isOwner, staffStoreSlug } from "@/lib/auth/store-scope";

/**
 * Lokationer i lagersystemet, som PhoneSpot bruger (spec §4.2 + Bilag A).
 * Vejle-butikken har intet eget delelager — den trækker fra det delte hovedlager.
 * 'esbjerg' er ikke en StoreId endnu (åbner nov 2026), men mappes allerede.
 */
export const PHONESPOT_LOCATION_CODES = ["vejle-hub", "phonespot-slagelse", "phonespot-esbjerg"] as const;
export type PhoneSpotLocationCode = (typeof PHONESPOT_LOCATION_CODES)[number];

const STORE_TO_LOCATION: Record<string, PhoneSpotLocationCode> = {
  vejle: "vejle-hub",
  slagelse: "phonespot-slagelse",
  esbjerg: "phonespot-esbjerg",
};

export const LOCATION_LABELS: Record<PhoneSpotLocationCode, string> = {
  "vejle-hub": "Hovedlager Vejle",
  "phonespot-slagelse": "Slagelse",
  "phonespot-esbjerg": "Esbjerg",
};

export function isPhoneSpotLocation(v: unknown): v is PhoneSpotLocationCode {
  return typeof v === "string" && (PHONESPOT_LOCATION_CODES as readonly string[]).includes(v);
}

export function locationForStore(storeId: string | null | undefined): PhoneSpotLocationCode | null {
  if (typeof storeId !== "string") return null;
  return STORE_TO_LOCATION[storeId.trim().toLowerCase()] ?? null;
}

export function actorLabel(staff: { name: string | null; email: string | null }): string {
  const who = staff.name?.trim() || staff.email?.trim() || "ukendt medarbejder";
  return `PhoneSpot-admin: ${who}`;
}

/**
 * Butiksafgrænsning for lagerlokationer: ejeren må alle PhoneSpot-lokationer,
 * øvrige kun den lokation deres egen butik mapper til. Webshop-medarbejdere og
 * medarbejdere uden butik må ingen (fail closed).
 */
export function canUseLocation(
  staff: { role: string; location_slug: string | null },
  code: string,
): code is PhoneSpotLocationCode {
  if (!isPhoneSpotLocation(code)) return false;
  if (isOwner(staff)) return true;
  return locationForStore(staffStoreSlug(staff)) === code;
}
