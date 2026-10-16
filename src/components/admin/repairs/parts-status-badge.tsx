import { Pill } from "@/components/admin/repairs/ui";
import type { PartsStatus } from "@/lib/lagersystem/types";

const BADGE: Partial<Record<PartsStatus, { label: string; tone: "amber" | "grey" | "green" }>> = {
  needs_order: { label: "Skal bestilles", tone: "amber" },
  ordered: { label: "Bestilt", tone: "grey" },
  requested: { label: "Anmodet", tone: "grey" },
  in_transit: { label: "Undervejs", tone: "green" },
};

/** Spec §4.4: kun synligt for personalet. 'ok' og 'unknown' vises ikke. Samme Pill som de øvrige sagsmærker. */
export function PartsStatusBadge({ status }: { status: PartsStatus | null | undefined }) {
  const badge = status ? BADGE[status] : undefined;
  if (!badge) return null;
  return <Pill tone={badge.tone}>{badge.label}</Pill>;
}
