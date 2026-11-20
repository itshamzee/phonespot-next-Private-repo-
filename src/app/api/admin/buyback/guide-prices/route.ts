import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { requireStaff } from "@/lib/auth/require-staff";
import {
  guideFactor,
  guidePriceTable,
  loadGuideListings,
  loadReferencePrices,
  referencePriceTable,
} from "@/lib/buyback/guide-price-server";

/* GET — de vejledende priser lige nu (fin stand), regnet på de aktuelle salgspriser. */
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const settings = await loadBuybackSettings(supabase);
  const own = guidePriceTable(await loadGuideListings(supabase), settings);
  const reference = referencePriceTable(await loadReferencePrices(supabase), settings, own);
  return NextResponse.json({ enabled: settings.publicPriceEnabled, factor: guideFactor(settings), rows: [...own, ...reference] });
}
