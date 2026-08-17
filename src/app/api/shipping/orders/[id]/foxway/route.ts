import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as { status?: string; order_ref?: string };

  if (body.status !== "pending" && body.status !== "ordered") {
    return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, foxway_status")
    .eq("id", id)
    .single();

  if (!order || !order.foxway_status) {
    return NextResponse.json({ error: "Ordren er ikke en dropship-ordre" }, { status: 404 });
  }

  const foxway_order_ref = body.status === "ordered" ? (body.order_ref?.trim() || null) : null;

  const { error } = await supabase
    .from("orders")
    .update({ foxway_status: body.status, foxway_order_ref, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    action: body.status === "ordered" ? "foxway_ordered" : "foxway_pending",
    entity_type: "order",
    entity_id: id,
    details: foxway_order_ref ? { foxway_order_ref } : {},
  });

  return NextResponse.json({ foxway_status: body.status, foxway_order_ref });
}
