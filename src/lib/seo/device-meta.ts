/**
 * Fælles hjælpere for enhedssider (product_templates).
 *
 * Enheder har ÉN kanonisk URL: /refurbished/<slug>. Fallback-metadata bruges kun,
 * når skabelonen mangler meta_title / meta_description i databasen.
 * 36 mdr. garanti og 30 dages returret gælder kun enheder (se lib/promises.ts).
 */

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 155;

/** Kanonisk sti for en enhed. */
export function deviceCanonicalPath(slug: string): string {
  return `/refurbished/${slug}`;
}

/** Fjerner "Apple " foran, så titlen holder sig inden for ca. 60 tegn. */
export function shortDeviceName(displayName: string): string {
  return displayName.trim().replace(/^Apple\s+/i, "");
}

export function fallbackDeviceTitle(displayName: string): string {
  const name = shortDeviceName(displayName);
  const full = `${name} brugt | Refurbished med 36 mdr. garanti | PhoneSpot`;
  if (full.length <= MAX_TITLE) return full;
  return `${name} brugt | PhoneSpot`;
}

type DeviceKind = "iphone" | "ipad" | "laptop" | "smartwatch" | string;

function kindNoun(category: DeviceKind | undefined): string {
  if (category === "ipad") return "tablet";
  if (category === "laptop") return "bærbar";
  if (category === "smartwatch") return "smartwatch";
  return "telefon";
}

export function fallbackDeviceDescription(
  displayName: string,
  category?: DeviceKind,
): string {
  const name = shortDeviceName(displayName);
  const noun = kindNoun(category);
  // Batteri min. 90 % er et løfte for telefoner og tablets (promises.ts).
  const battery =
    category === "laptop" || category === "smartwatch"
      ? ""
      : " Batteri min. 90 % ved levering.";
  const text = `Køb brugt ${name} som refurbished ${noun}. 36 mdr. garanti og 30 dages returret.${battery}`;
  if (text.length <= MAX_DESCRIPTION) return text;
  return `Køb brugt ${name}. 36 mdr. garanti og 30 dages returret.`.slice(0, MAX_DESCRIPTION);
}
