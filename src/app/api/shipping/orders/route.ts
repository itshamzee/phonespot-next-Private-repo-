import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const locationId = searchParams.get("location");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = Math.min(parseInt(searchParams.get("per_page") ?? "25", 10), 100);

  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select(
      "*, customer:customers(name, email, phone)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const search = searchParams.get("search");
  if (search) {
    // Search by order_number first; if search looks like it could be a name/email,
    // also find matching customer IDs and include those orders
    const searchPattern = `%${search}%`;

    // Find customer IDs matching the search term
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);

    const customerIds = matchingCustomers?.map((c) => c.id) ?? [];

    if (customerIds.length > 0) {
      // Search across order_number OR matching customer IDs
      query = query.or(
        `order_number.ilike.${searchPattern},customer_id.in.(${customerIds.join(",")})`
      );
    } else {
      query = query.ilike("order_number", searchPattern);
    }
  }
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (locationId) query = query.eq("location_id", locationId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59Z");
  const foxway = searchParams.get("foxway");
  if (foxway === "any" || foxway === "pending") {
    // Dropship-koeen maa aldrig vise doede ordrer: en abandoned/cancelled
    // ordre er ikke betalt og skal ikke bestilles hos leverandoeren.
    query =
      foxway === "pending"
        ? query.eq("foxway_status", "pending")
        : query.not("foxway_status", "is", null);
    query = query.not("status", "in", "(abandoned,cancelled)");
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Orders query failed:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  // Fetch counts per status for tabs
  const countStatuses = ["pending", "confirmed", "shipped", "delivered", "refunded"];
  const countPromises = countStatuses.map((s) =>
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", s)
  );
  const countResults = await Promise.all(countPromises);
  const counts: Record<string, number> = {};
  countStatuses.forEach((s, i) => {
    counts[s] = countResults[i].count ?? 0;
  });

  return NextResponse.json({
    orders: data,
    total: count,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
    counts,
  });
}
