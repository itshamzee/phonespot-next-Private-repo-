import type { RepairService } from "@/lib/supabase/types";

/** Preserve the stored service name while making its selected quality explicit. */
export function repairServiceLabel(
  service: Pick<RepairService, "name" | "quality_tier">,
): string {
  const quality =
    service.quality_tier === "standard"
      ? "Standard"
      : service.quality_tier === "premium"
        ? "Premium"
        : service.quality_tier === "original"
          ? "Original"
          : null;
  return quality &&
    !service.name.toLocaleLowerCase("da-DK").includes(quality.toLowerCase())
    ? `${service.name} (${quality})`
    : service.name;
}
