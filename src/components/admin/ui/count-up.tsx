"use client";

import { formatNumber, type NumberFormat } from "./format-number";
import { useCountUp } from "./use-count-up";

/** Et tal, der tæller op til sin værdi. Til server-komponenter, der ikke kan bruge hooks. */
export function CountUp({ value, format = "kr", className }: { value: number; format?: NumberFormat; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{formatNumber(shown, format)}</span>;
}
