import { NextResponse } from "next/server";
import { FeedCatalogError, loadFeedCatalog } from "@/lib/feeds/catalog";
import {
  buildLocalInventoryRows,
  serializeLocalInventory,
  type FeedLocation,
} from "@/lib/feeds/google-local-inventory";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lokalt lager til Google Merchant Center (tabulatorsepareret fil).
 * Fejler hellere end at sende et tomt lager: et svar med nul overalt ville
 * melde alle varer udsolgt i butikkerne.
 */
export async function GET() {
  const supabase = createAdminClient();

  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select("id, slug")
    .eq("type", "store");
  if (locationError) {
    return new NextResponse(`Feed error: ${locationError.message}`, { status: 500 });
  }

  let catalog;
  try {
    catalog = await loadFeedCatalog(supabase);
  } catch (err) {
    if (err instanceof FeedCatalogError) {
      return new NextResponse(`Feed error: ${err.message}`, { status: 500 });
    }
    throw err;
  }
  if (!catalog.skuStock) {
    return new NextResponse("Feed error: lageret kunne ikke læses", { status: 500 });
  }

  const rows = buildLocalInventoryRows({
    locations: (locations ?? []) as FeedLocation[],
    deviceGroups: catalog.deviceGroups,
    accessories: catalog.accessories,
    skuStock: catalog.skuStock,
  });

  return new NextResponse(serializeLocalInventory(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
