import type { Metadata } from "next";
import { LocalRepairPage, LOCAL_PRICE_MODELS } from "@/components/repair/local-repair-page";
import { LOCAL_REPAIR_TOWNS, buildTownMetadata } from "@/lib/local-repair-towns";
import { getRepairPriceSummaries } from "@/lib/supabase/repairs";

export const revalidate = 3600;

const town = LOCAL_REPAIR_TOWNS.horsens;

export const metadata: Metadata = buildTownMetadata(town);

export default async function Page() {
  const prices = await getRepairPriceSummaries(LOCAL_PRICE_MODELS);
  return <LocalRepairPage town={town} prices={prices} />;
}
