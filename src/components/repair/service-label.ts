import type { RepairService } from "@/lib/supabase/types";

type Tier = NonNullable<RepairService["quality_tier"]>;

/**
 * Ét navnesæt for reservedelskvalitet på hele sitet. Databasen navngiver
 * ydelserne "Skærmskift (Budget|OEM|Original)", så kurv, oversigt og
 * prisliste følger de samme ord i stedet for Standard/Premium.
 */
export const QUALITY_LABEL: Record<Tier, string> = {
  standard: "Budget",
  premium: "OEM",
  original: "Original",
};

export const QUALITY_ORDER: Tier[] = ["standard", "premium", "original"];

/** Én linje, der forklarer kvaliteten, når ydelsen ikke selv har en note. */
export const QUALITY_BLURB: Record<Tier, string> = {
  standard: "Kompatibel reservedel med fuld funktion. Laveste pris.",
  premium: "Høj kvalitet, der matcher den fabriksmonterede del. Bedste forhold mellem pris og kvalitet.",
  original: "Producentens originale reservedel. Identisk med den fabriksmonterede.",
};

/** Kvalitetsnavnet for en ydelse: parentesen i navnet vinder, ellers tier-kortet. */
export function qualityLabel(
  service: Pick<RepairService, "name" | "quality_tier">,
): string | null {
  const fromName = service.name.match(/\(([^()]+)\)\s*$/)?.[1]?.trim();
  if (fromName) return fromName;
  return service.quality_tier ? QUALITY_LABEL[service.quality_tier] : null;
}

/** Preserve the stored service name while making its selected quality explicit. */
export function repairServiceLabel(
  service: Pick<RepairService, "name" | "quality_tier">,
): string {
  const quality = qualityLabel(service);
  return quality &&
    !service.name.toLocaleLowerCase("da-DK").includes(quality.toLocaleLowerCase("da-DK"))
    ? `${service.name} (${quality})`
    : service.name;
}
