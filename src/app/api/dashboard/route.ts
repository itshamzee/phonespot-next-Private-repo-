import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/dashboard?period=<today|week|month|quarter>&location_id=<optional>
 * Platform e-commerce KPIs. Staff only.
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "month";
    const locationId = searchParams.get("location_id");

    // Calculate date range
    const now = new Date();
    let startDate: string;
    if (period === "today") {
      startDate = now.toISOString().slice(0, 10) + "T00:00:00.000Z";
    } else if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString();
    } else if (period === "quarter") {
      const quarterStart = new Date(now);
      quarterStart.setMonth(quarterStart.getMonth() - 3);
      startDate = quarterStart.toISOString();
    } else {
      // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // 1. Orders in period
    let ordersQuery = supabase
      .from("orders")
      .select(`
        id, type, total, brugtmoms_total, status, payment_method,
        confirmed_at, location_id,
        order_items ( item_type, quantity, unit_price, total_price, purchase_price, vat_scheme )
      `)
      .in("status", ["confirmed", "shipped", "picked_up", "delivered"])
      .gte("confirmed_at", startDate);

    if (locationId) {
      ordersQuery = ordersQuery.eq("location_id", locationId);
    }

    const { data: orders } = await ordersQuery;
    const allOrders = orders ?? [];

    // Aggregate KPIs
    let totalRevenue = 0;
    let totalOrders = 0;
    let onlineOrders = 0;
    let posOrders = 0;
    let devicesSold = 0;
    let skusSold = 0;
    let totalMargin = 0;
    let brugtmomsTotal = 0;

    for (const order of allOrders) {
      totalRevenue += order.total;
      totalOrders += 1;
      brugtmomsTotal += order.brugtmoms_total ?? 0;

      if (order.type === "pos") posOrders += 1;
      else onlineOrders += 1;

      const items = (order as any).order_items ?? [];
      for (const item of items) {
        if (item.item_type === "device") {
          devicesSold += item.quantity;
          if (item.purchase_price !== null) {
            totalMargin += item.total_price - item.purchase_price;
          }
        } else {
          skusSold += item.quantity;
        }
      }
    }

    // 2. Inventory value
    const { data: listedDevices } = await supabase
      .from("devices")
      .select("selling_price, purchase_price")
      .eq("status", "listed");

    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;
    for (const dev of listedDevices ?? []) {
      inventoryRetailValue += dev.selling_price ?? 0;
      inventoryCostValue += dev.purchase_price ?? 0;
    }

    // 3. Inventory count by location
    const { data: devicesByLocation } = await supabase
      .from("devices")
      .select("location_id, id")
      .eq("status", "listed");

    const locationCounts: Record<string, number> = {};
    for (const dev of devicesByLocation ?? []) {
      locationCounts[dev.location_id] = (locationCounts[dev.location_id] ?? 0) + 1;
    }

    // 4. Recent activity (last 20 entries)
    const { data: activity } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      period,
      kpis: {
        totalRevenue,
        totalOrders,
        onlineOrders,
        posOrders,
        devicesSold,
        skusSold,
        totalMargin,
        brugtmomsTotal,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
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
      { status: 500 }
    );
  }
}
