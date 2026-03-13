// GET  /api/platform/draft-orders — list draft orders (optional ?status= filter)
// POST /api/platform/draft-orders — create a new draft order

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DraftLineItem } from "@/lib/supabase/platform-types";

/** Recalculates subtotal, tax_amount, and total from line items. */
function calculateTotals(lineItems: DraftLineItem[], shippingCost = 0, discountAmount = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const lineTotal = item.unit_price * item.quantity;
    return sum + Math.round(lineTotal * (item.tax_rate ?? 0));
  }, 0);
  const total = subtotal + shippingCost - discountAmount;
  return { subtotal, tax_amount: taxAmount, total };
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const params = request.nextUrl.searchParams;
  const status = params.get("status");

  let query = supabase
    .from("draft_orders")
    .select(`
      *,
      customer:customers(id, name, email, phone)
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft_orders: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    customer_id,
    customer_email,
    customer_name,
    line_items,
    shipping_cost,
    discount_amount,
    currency,
    internal_note,
    customer_note,
    repair_ticket_id,
  } = body;

  const items: DraftLineItem[] = line_items ?? [];
  const shipping = shipping_cost ?? 0;
  const discount = discount_amount ?? 0;

  const { subtotal, tax_amount, total } = calculateTotals(items, shipping, discount);

  const supabase = createAdminClient();

  // Generate draft_number using a PostgreSQL sequence
  const { data: seqData, error: seqError } = await supabase
    .rpc("nextval_draft_order_number");

  let draftNumber: string;
  if (seqError || !seqData) {
    // Fallback: use timestamp-based number if sequence not available
    console.warn("[draft-orders POST] Sequence RPC failed, using fallback:", seqError?.message);
    draftNumber = `DO-${Date.now()}`;
  } else {
    draftNumber = `DO-${String(seqData).padStart(6, "0")}`;
  }

  const { data, error } = await supabase
    .from("draft_orders")
    .insert({
      draft_number: draftNumber,
      customer_id: customer_id ?? null,
      customer_email: customer_email ?? null,
      customer_name: customer_name ?? null,
      status: "draft",
      line_items: items,
      subtotal,
      discount_amount: discount,
      shipping_cost: shipping,
      tax_amount,
      total,
      currency: currency ?? "DKK",
      internal_note: internal_note ?? null,
      customer_note: customer_note ?? null,
      repair_ticket_id: repair_ticket_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
