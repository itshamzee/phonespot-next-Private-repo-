import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackSettings } from "./types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export const DEFAULT_BUYBACK_SETTINGS: BuybackSettings = {
  targetMarginPct: 0.4,
  floorMarginPct: 0.3,
  floorMarginMinOre: 40000,
  cleaningProbability: {
    screen: 0,
    back_glass: 0,
    battery: 0,
    charging: 0.9,
  },
};

export async function loadBuybackSettings(client: SupabaseAdmin): Promise<BuybackSettings> {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", "buyback")
    .maybeSingle();

  const override = ((data as { value?: unknown } | null)?.value ?? {}) as Partial<BuybackSettings>;
  return {
    ...DEFAULT_BUYBACK_SETTINGS,
    ...override,
    cleaningProbability: {
      ...DEFAULT_BUYBACK_SETTINGS.cleaningProbability,
      ...(override.cleaningProbability ?? {}),
    },
  };
}
