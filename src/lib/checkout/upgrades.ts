import type { CartUpgradeSelection } from "@/lib/cart/types";

export interface AllowedUpgrade {
  id: string;
  kind: "ram" | "ssd";
  label: string;
  price: number;
}

/**
 * Verificér kundens opgraderingsvalg mod de tilladte optioner for modellen.
 * Pris og label tages ALTID fra serverens data — klientens værdier smides væk.
 */
export function resolveUpgrades(
  selected: CartUpgradeSelection[],
  allowed: AllowedUpgrade[],
): { upgrades: CartUpgradeSelection[]; error: string | null } {
  if (selected.length === 0) return { upgrades: [], error: null };

  const byId = new Map(allowed.map((a) => [a.id, a]));
  const seenKinds = new Set<string>();
  const upgrades: CartUpgradeSelection[] = [];

  for (const sel of selected) {
    const match = byId.get(sel.optionId);
    if (!match) {
      return { upgrades: [], error: "Opgraderingen er ikke tilgængelig for denne model" };
    }
    if (seenKinds.has(match.kind)) {
      return { upgrades: [], error: "Der kan kun vælges én opgradering af hver type" };
    }
    seenKinds.add(match.kind);
    upgrades.push({ optionId: match.id, kind: match.kind, label: match.label, price: match.price });
  }
  return { upgrades, error: null };
}
