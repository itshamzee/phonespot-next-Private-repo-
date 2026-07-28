import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackSettings, PricingResult } from "./types";
import { readLeadDevices, deviceLabel } from "./lead-devices";
import { estimateBuyback } from "./estimate";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export interface LeadSuggestion {
  status: "ok" | "manual";
  manualReason?: string;
  totalAimOre: number;
  totalFloorOre: number;
  perDevice: { label: string; result: PricingResult }[];
  suggestDecline: boolean;
}

// A lead may hold several devices but an offer is a single amount. If even one
// device cannot be priced, the whole lead is manual — a partial sum would be a
// number nobody could defend to the customer.
export async function suggestForLead(
  client: SupabaseAdmin,
  metadata: unknown,
  settings: BuybackSettings,
): Promise<LeadSuggestion> {
  const leadDevices = readLeadDevices(metadata);

  if (leadDevices.length === 0) {
    return {
      status: "manual",
      manualReason: "Ingen enheder på henvendelsen",
      totalAimOre: 0,
      totalFloorOre: 0,
      perDevice: [],
      suggestDecline: false,
    };
  }

  const perDevice: { label: string; result: PricingResult }[] = [];
  for (const entry of leadDevices) {
    const result = await estimateBuyback(client, entry.device, entry.condition, settings);
    perDevice.push({ label: deviceLabel(entry.device), result });
  }

  const suggestDecline = leadDevices.some(
    (entry) => entry.condition.cloudLocked.trim().toLowerCase() === "ja",
  );

  const failed = perDevice.find((entry) => entry.result.status === "manual");
  if (failed) {
    return {
      status: "manual",
      manualReason: `${failed.label}: ${failed.result.manualReason ?? "kan ikke prissættes"}`,
      totalAimOre: 0,
      totalFloorOre: 0,
      perDevice,
      suggestDecline,
    };
  }

  return {
    status: "ok",
    totalAimOre: perDevice.reduce((sum, e) => sum + e.result.aimOfferOre, 0),
    totalFloorOre: perDevice.reduce((sum, e) => sum + e.result.floorOfferOre, 0),
    perDevice,
    suggestDecline,
  };
}
