/**
 * The seller's postcode and city, as typed into one free-text field.
 *
 * The acceptance form asked for "4200 Slagelse" in a single box and required
 * nothing, so what came back was "4000", "9000 Aalborg ", "DK-4200 Slagelse"
 * and "213123". A label needs a real postcode and a city, and rejecting
 * everything that is not perfectly formatted meant no parcel could be booked
 * for half the customers who had said yes.
 */

export interface ParsedPostal {
  zipcode: string;
  /** Empty when the customer typed only a postcode; look it up. */
  city: string;
}

/** Danish postcodes run 1000–9999. Anything else is a typo, not an address. */
export function isDanishPostcode(value: string): boolean {
  return /^\d{4}$/.test(value) && Number(value) >= 1000;
}

/**
 * Reads "4200 Slagelse", "4200", "DK-4200 Slagelse" and "  9000 Aalborg  ".
 * Returns null when there is no plausible Danish postcode in the string.
 */
export function parsePostalCity(raw: string | null | undefined): ParsedPostal | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  // A leading country prefix is common when people copy an address.
  const withoutPrefix = text.replace(/^dk[\s-]*/i, "").trim();

  const match = withoutPrefix.match(/^(\d{4})(?:\s+(.*))?$/);
  if (!match || !isDanishPostcode(match[1])) return null;

  return { zipcode: match[1], city: (match[2] ?? "").trim() };
}

/**
 * The official city for a postcode, from Danmarks Adressers Web API. Public,
 * no key. Returns null for a postcode that does not exist, which is how
 * "213123" gets caught rather than turning into a label to nowhere.
 */
export async function lookupCity(zipcode: string): Promise<string | null> {
  if (!isDanishPostcode(zipcode)) return null;
  try {
    const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${zipcode}`, {
      // The register changes a few times a year.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { navn?: string };
    return typeof data.navn === "string" && data.navn ? data.navn : null;
  } catch {
    return null;
  }
}

/**
 * A postcode and city good enough to put on a parcel, filling in the city from
 * the register when the customer left it out.
 */
export async function resolvePostalCity(
  raw: string | null | undefined,
): Promise<ParsedPostal | null> {
  const parsed = parsePostalCity(raw);
  if (!parsed) return null;
  if (parsed.city) return parsed;

  const city = await lookupCity(parsed.zipcode);
  return city ? { zipcode: parsed.zipcode, city } : null;
}
