import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/pos/cashup?location_id=<id>&date=<YYYY-MM-DD>
 * Daily cash-up summary for a location.
 * Shows total sales broken down by payment method.
 * Staff only.
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
    const locationId = searchParams.get("location_id");
    const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    if (!locationId) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
    }

    // Fetch all POS orders for this location on this date
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id, order_number, total, payment_method, status, confirmed_at,
        order_items ( item_type, quantity, unit_price, total_price )
      `)
      .eq("type", "pos")
      .eq("location_id", locationId)
      .in("status", ["confirmed", "picked_up", "delivered"])
      .gte("confirmed_at", dayStart)
      .lte("confirmed_at", dayEnd)
      .order("confirmed_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    const allOrders = orders ?? [];

    // Aggregate by payment method
    const byMethod: Record<string, { count: number; total: number }> = {
      card: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      mobilepay: { count: 0, total: 0 },
    };

    let totalSales = 0;
    let totalOrders = 0;
    let deviceCount = 0;
    let skuCount = 0;

    for (const order of allOrders) {
      const method = order.payment_method ?? "card";
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count += 1;
      byMethod[method].total += order.total;
      totalSales += order.total;
      totalOrders += 1;

      const items = (order as any).order_items ?? [];
      for (const item of items) {
        if (item.item_type === "device") deviceCount += item.quantity;
        else skuCount += item.quantity;
      }
    }

    return NextResponse.json({
      date: dateStr,
      locationId,
      totalOrders,
      totalSales,
      deviceCount,
      skuCount,
      byPaymentMethod: byMethod,
      orders: allOrders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        total: o.total,
        paymentMethod: o.payment_method,
        confirmedAt: o.confirmed_at,
      })),
    });
  } catch (err) {
    console.error("Cash-up error:", err);
    return NextResponse.json(
      { error: "Fejl ved hentning af dagsoversigt" },
      { status: 500 }
    );
  }
}
