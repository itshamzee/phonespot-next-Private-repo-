import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedCatalogError, loadFeedCatalog, type FeedCatalog } from "@/lib/feeds/catalog";
import {
  BASE_URL,
  buildAccessoryItem,
  buildDeviceItem,
  dedupeAccessoryTitles,
  sharedGroupIds,
} from "@/lib/feeds/google-shopping";

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  let catalog: FeedCatalog;
  try {
    catalog = await loadFeedCatalog(createAdminClient());
  } catch (err) {
    if (err instanceof FeedCatalogError) {
      return new NextResponse(`Feed error: ${err.message}`, { status: 500 });
    }
    throw err;
  }
  const { accessories, deviceGroups, skuStock } = catalog;

  // Lagerstatus pr. tilbehør (samme sum som produktsiden: sku_stock.quantity).
  // Ved fejl behandles lageret som ukendt (null) — så sender feedet kun
  // in_stock for always_in_stock-varer.
  const stockByProduct = new Map<string, number>();
  for (const r of skuStock ?? []) {
    stockByProduct.set(
      r.product_id,
      (stockByProduct.get(r.product_id) ?? 0) + Math.max(0, r.quantity ?? 0),
    );
  }

  // Build accessory items
  const titles = dedupeAccessoryTitles(accessories);
  const groupIds = sharedGroupIds(accessories);
  const accessoryItems: string[] = [];
  for (const product of accessories) {
    const stock = skuStock ? (stockByProduct.get(product.id) ?? 0) : null;
    const item = buildAccessoryItem(product, stock, titles.get(product.id), groupIds);
    if (item) accessoryItems.push(item);
  }

  // Build device items
  const deviceItems: string[] = [];
  for (const group of deviceGroups) {
    const item = buildDeviceItem(group);
    if (item) deviceItems.push(item);
  }

  const allItems = [...accessoryItems, ...deviceItems];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>PhoneSpot</title>
    <link>${BASE_URL}</link>
    <description>Refurbished telefoner, reparation og tilbehoer</description>
${allItems.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
