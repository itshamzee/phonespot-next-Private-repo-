"use client";

import { useCountUp } from "@/components/admin/ui/use-count-up";
import { formatKr } from "@/lib/admin/overview/format";

/**
 * Nøgletal på Overblik. Første visning står med den rigtige værdi; skifter tallet
 * bagefter (ny periode), tæller det over til den nye værdi (useCountUp, springer under
 * reduceret bevægelse). Samme formater som før: formatKr til beløb i øre, antal som rent heltal.
 */
export function KpiNumber({ value, kind }: { value: number; kind: "kr" | "count" }) {
  const shown = useCountUp(value);
  return <>{kind === "kr" ? formatKr(shown) : String(Math.round(shown))}</>;
}
