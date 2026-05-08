import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/dashboard?period=<today|week|month|quarter>&location_id=<optional>
 *
 * Platform e-commerce KPIs. Staff only.
 *
 * Returns:
 *   - kpis (current period)
 *   - previous (same shape, prior comparable period — for delta arrows)
 *   - timeSeries (daily revenue + order count for the last 30 days)
 *   - topProducts (top 5 by revenue this period)
 *   - lowStock (templates with ≤1 listed device, sorted by stock asc)
 *   - abandoned (count + value of abandoned/checkout orders)
 *   - inventory (listed count + value + per-location)
 *   - activity (last 20 audit entries)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: staff } = await supabase
      .from("staff")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Use admin client for DB reads — auth has already been verified above.
    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "month";
    const locationId = searchParams.get("location_id");

    /* ------------------------------------------------------------ *
     * Date ranges — current + previous comparable period
     * ------------------------------------------------------------ */
    const now = new Date();
    let startDate: Date;
    let prevStart: Date;
    let prevEnd: Date;

    if (period === "today") {
      startDate = new Date(now);
      startDate.setUTCHours(0, 0, 0, 0);
      prevEnd = new Date(startDate);
      prevStart = new Date(startDate);
      prevStart.setUTCDate(prevStart.getUTCDate() - 1);
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 7);
      prevEnd = new Date(startDate);
      prevStart = new Date(startDate);
      prevStart.setUTCDate(prevStart.getUTCDate() - 7);
    } else if (period === "quarter") {
      startDate = new Date(now);
      startDate.setUTCMonth(startDate.getUTCMonth() - 3);
      prevEnd = new Date(startDate);
      prevStart = new Date(startDate);
      prevStart.setUTCMonth(prevStart.getUTCMonth() - 3);
    } else {
      // month — current calendar month
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      prevEnd = new Date(startDate);
      prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    }

    const startISO = startDate.toISOString();
    const prevStartISO = prevStart.toISOString();
    const prevEndISO = prevEnd.toISOString();

    /* ------------------------------------------------------------ *
     * Helper: aggregate KPIs across a set of orders
     * ------------------------------------------------------------ */
    function aggregate(orders: Array<Record<string, unknown>>) {
      let totalRevenue = 0;
      let totalOrders = 0;
      let onlineOrders = 0;
      let posOrders = 0;
      let devicesSold = 0;
      let skusSold = 0;
      let totalMargin = 0;
      let brugtmomsTotal = 0;

      for (const order of orders) {
        totalRevenue += (order.total as number) ?? 0;
        totalOrders += 1;
        brugtmomsTotal += (order.brugtmoms_total as number) ?? 0;
        if (order.type === "pos") posOrders += 1;
        else onlineOrders += 1;
        const items = (order.order_items as Array<Record<string, number | string | null>>) ?? [];
        for (const item of items) {
          if (item.item_type === "device") {
            devicesSold += (item.quantity as number) ?? 0;
            if (item.purchase_price != null) {
              totalMargin += ((item.total_price as number) ?? 0) - (item.purchase_price as number);
            }
          } else {
            skusSold += (item.quantity as number) ?? 0;
          }
        }
      }
      return {
        totalRevenue,
        totalOrders,
        onlineOrders,
        posOrders,
        devicesSold,
        skusSold,
        totalMargin,
        brugtmomsTotal,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      };
    }

    /* ------------------------------------------------------------ *
     * 1. Current period orders
     * ------------------------------------------------------------ */
    let q = admin
      .from("orders")
      .select(
        `id, type, total, brugtmoms_total, status, payment_method, confirmed_at, location_id,
         order_items ( item_type, quantity, unit_price, total_price, purchase_price,
                       device_id, sku_product_id,
                       device:devices(template_id, template:product_templates(id, slug, display_name)),
                       sku_product:sku_products(title) )`,
      )
      .in("status", ["confirmed", "shipped", "picked_up", "delivered"])
      .gte("confirmed_at", startISO);
    if (locationId) q = q.eq("location_id", locationId);
    const { data: orders } = await q;
    const allOrders = (orders ?? []) as Array<Record<string, unknown>>;

    /* ------------------------------------------------------------ *
     * 2. Previous comparable period — KPI deltas
     * ------------------------------------------------------------ */
    let pq = admin
      .from("orders")
      .select(`id, type, total, brugtmoms_total, status, confirmed_at, location_id,
               order_items ( item_type, quantity, total_price, purchase_price )`)
      .in("status", ["confirmed", "shipped", "picked_up", "delivered"])
      .gte("confirmed_at", prevStartISO)
      .lt("confirmed_at", prevEndISO);
    if (locationId) pq = pq.eq("location_id", locationId);
    const { data: prevOrders } = await pq;

    const kpis = aggregate(allOrders);
    const previous = aggregate((prevOrders ?? []) as Array<Record<string, unknown>>);

    /* ------------------------------------------------------------ *
     * 3. 30-day time series — revenue + order count per UTC date
     * ------------------------------------------------------------ */
    const tsStart = new Date(now);
    tsStart.setUTCDate(tsStart.getUTCDate() - 29);
    tsStart.setUTCHours(0, 0, 0, 0);
    const { data: tsRows } = await admin
      .from("orders")
      .select("total, confirmed_at")
      .in("status", ["confirmed", "shipped", "picked_up", "delivered"])
      .gte("confirmed_at", tsStart.toISOString());

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(tsStart);
      d.setUTCDate(d.getUTCDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    }
    for (const r of tsRows ?? []) {
      if (!r.confirmed_at) continue;
      const day = (r.confirmed_at as string).slice(0, 10);
      const bucket = dailyMap.get(day);
      if (bucket) {
        bucket.revenue += (r.total as number) ?? 0;
        bucket.orders += 1;
      }
    }
    const timeSeries = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      revenue: v.revenue,
      orders: v.orders,
    }));

    /* ------------------------------------------------------------ *
     * 4. Top 5 selling products (this period, by revenue)
     * ------------------------------------------------------------ */
    type TopRow = { name: string; units: number; revenue: number; slug?: string };
    const productMap = new Map<string, TopRow>();
    for (const order of allOrders) {
      const items = (order.order_items as Array<Record<string, unknown>>) ?? [];
      for (const item of items) {
        let key: string;
        let name: string;
        let slug: string | undefined;
        if (item.item_type === "device") {
          const tpl = ((item.device as Record<string, unknown>)?.template) as
            | { id?: string; slug?: string; display_name?: string }
            | undefined;
          if (!tpl) continue;
          key = `dev:${tpl.id ?? tpl.slug ?? tpl.display_name}`;
          name = tpl.display_name ?? "Enhed";
          slug = tpl.slug;
        } else {
          const sku = (item.sku_product as { title?: string } | undefined);
          if (!sku?.title) continue;
          key = `sku:${sku.title}`;
          name = sku.title;
        }
        const existing = productMap.get(key) ?? { name, units: 0, revenue: 0, slug };
        existing.units += (item.quantity as number) ?? 0;
        existing.revenue += (item.total_price as number) ?? 0;
        productMap.set(key, existing);
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    /* ------------------------------------------------------------ *
     * 5. Inventory — listed devices, value, per-location, low stock
     * ------------------------------------------------------------ */
    const { data: listedDevices } = await admin
      .from("devices")
      .select("id, selling_price, purchase_price, location_id, template_id")
      .eq("status", "listed");

    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;
    const locationCounts: Record<string, number> = {};
    const templateCounts = new Map<string, number>();
    for (const dev of listedDevices ?? []) {
      inventoryRetailValue += dev.selling_price ?? 0;
      inventoryCostValue += dev.purchase_price ?? 0;
      if (dev.location_id) locationCounts[dev.location_id] = (locationCounts[dev.location_id] ?? 0) + 1;
      if (dev.template_id) templateCounts.set(dev.template_id, (templateCounts.get(dev.template_id) ?? 0) + 1);
    }

    // Low stock = templates with status=published AND ≤1 listed device.
    // Pull all published templates, then filter — we can't easily do this in one query.
    const { data: publishedTpls } = await admin
      .from("product_templates")
      .select("id, display_name, slug, category")
      .eq("status", "published");
    const lowStock = (publishedTpls ?? [])
      .map((t) => ({
        template_id: t.id,
        name: t.display_name,
        slug: t.slug,
        category: t.category,
        device_count: templateCounts.get(t.id) ?? 0,
      }))
      .filter((t) => t.device_count <= 1)
      .sort((a, b) => a.device_count - b.device_count || a.name.localeCompare(b.name))
      .slice(0, 12);

    /* ------------------------------------------------------------ *
     * 6. Abandoned orders summary
     * ------------------------------------------------------------ */
    const { data: abandonedOrders } = await admin
      .from("orders")
      .select("id, total, abandoned_at")
      .in("status", ["abandoned", "checkout"])
      .order("abandoned_at", { ascending: false, nullsFirst: false });
    const abandoned = {
      count: abandonedOrders?.length ?? 0,
      totalValue: (abandonedOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0),
    };

    /* ------------------------------------------------------------ *
     * 7. Recent activity
     * ------------------------------------------------------------ */
    const { data: activity } = await admin
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      period,
      kpis,
      previous,
      timeSeries,
      topProducts,
      lowStock,
      abandoned,
      inventory: {
        listedCount: listedDevices?.length ?? 0,
        retailValue: inventoryRetailValue,
        costValue: inventoryCostValue,
        byLocation: locationCounts,
      },
      activity: activity ?? [],
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json(
      { error: "Fejl ved hentning af dashboard data" },
      { status: 500 },
    );
  }
}
