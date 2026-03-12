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

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (locationId) query = query.eq("location_id", locationId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to + "T23:59:59Z");

  const { data, count, error } = await query;

  if (error) {
    console.error("Orders query failed:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  return NextResponse.json({
    orders: data,
    total: count,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}
