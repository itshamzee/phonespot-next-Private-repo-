import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushover } from "@/lib/notifications/pushover";

/**
 * GET /api/cron/low-stock
 * Checks for low stock SKU products and sends a Pushover alert.
 * Run daily via cron. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find SKU products where stock is at or below min_level (and not always_in_stock)
  const { data: lowStockItems, error } = await supabase
    .from("sku_stock")
    .select(`
      quantity, min_level,
      product:sku_products!inner(id, title, category, always_in_stock, is_active)
    `)
    .eq("sku_products.is_active", true)
    .eq("sku_products.always_in_stock", false);

  if (error) {
    console.error("[low-stock] Query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to items where quantity <= min_level (or quantity <= 3 if no min_level set)
  const alerts = (lowStockItems ?? []).filter((item: any) => {
    const threshold = item.min_level > 0 ? item.min_level : 3;
    return item.quantity <= threshold;
  });

  if (alerts.length === 0) {
    return NextResponse.json({ message: "No low stock items", count: 0 });
  }

  // Build notification message
  const lines = alerts.map((item: any) => {
    const product = item.product as any;
    return `• ${product.title}: ${item.quantity} stk (min: ${item.min_level || 3})`;
  });

  const message = `${alerts.length} ${alerts.length === 1 ? "produkt" : "produkter"} har lav lagerbeholdning:\n\n${lines.join("\n")}`;

  await sendPushover({
    title: `Lav lager — ${alerts.length} ${alerts.length === 1 ? "produkt" : "produkter"}`,
    message,
    sound: "siren",
    priority: 0, // normal priority for stock alerts
    url: "https://phonespot.dk/admin/platform/lager",
    url_title: "Se lagerstatus",
  });

  console.log(`[low-stock] Alert sent for ${alerts.length} items`);
  return NextResponse.json({ count: alerts.length, items: alerts.map((a: any) => (a.product as any)?.title) });
}
