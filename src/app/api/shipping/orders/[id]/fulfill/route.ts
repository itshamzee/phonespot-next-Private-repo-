import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const { tracking_number, tracking_url, carrier } = body;

  const supabase = createAdminClient();

  // Update order
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "shipped",
      status: "shipped",
      tracking_number: tracking_number || null,
      tracking_url: tracking_url || null,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, customer:customers(email, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log to activity_log
  await supabase.from("activity_log").insert({
    action: "order_fulfilled",
    entity_type: "order",
    entity_id: id,
    details: { tracking_number, tracking_url, carrier },
  });

  // TODO: Send shipping notification email (when email templates are set up)

  return NextResponse.json(order);
}
