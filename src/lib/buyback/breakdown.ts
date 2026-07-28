import type { FaultType, PricingResult } from "./types";

const FAULT_LABEL: Record<FaultType, string> = {
  screen: "skærm",
  back_glass: "bagglas",
  battery: "batteri",
  charging: "ladestik",
};

function kr(ore: number): string {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(ore / 100));
}

// One line an admin can read at a glance and defend to a customer. Whole kroner:
// the øre precision is noise in this context. Empty for a manual result, where
// the reason is what matters, not the arithmetic.
export function explainPricing(result: PricingResult): string {
  if (result.status !== "ok" || result.saleValueOre == null) return "";

  const marginOre = result.saleValueOre - result.totalDeductionOre - result.aimOfferOre;
  const parts = [`Egen salgspris ${kr(result.saleValueOre)}`, `− margin ${kr(marginOre)}`];

  for (const fault of result.faults) {
    parts.push(`− ${FAULT_LABEL[fault.type]} ${kr(fault.partPriceOre)}`);
  }

  return `${parts.join(" ")} = ${kr(result.aimOfferOre)} kr`;
}
