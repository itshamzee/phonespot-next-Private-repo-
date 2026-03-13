// GET    /api/platform/draft-orders/[id] — fetch single draft order
// PUT    /api/platform/draft-orders/[id] — update draft order (recalculates totals)
// DELETE /api/platform/draft-orders/[id] — cancel draft order

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("draft_orders")
    .select(`
      *,
      customer:customers(id, name, email, phone),
      converted_order:orders(id, order_number, status, payment_status)
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Verify draft order exists and is editable
  const { data: existing, error: fetchError } = await supabase
    .from("draft_orders")
    .select("status, converted_order_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Draft order not found" }, { status: 404 });
  }

  if (existing.converted_order_id) {
    return NextResponse.json(
      { error: "Cannot edit a draft order that has already been converted" },
      { status: 400 },
    );
  }

  if (existing.status === "converting" || existing.status === "paid") {
    return NextResponse.json(
      { error: `Cannot edit a draft order with status '${existing.status}'` },
      { status: 400 },
    );
  }

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
    status,
  } = body;

  // Recalculate totals if line_items are provided
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (line_items !== undefined) {
    const items: DraftLineItem[] = line_items;
    const shipping = shipping_cost ?? 0;
    const discount = discount_amount ?? 0;
    const { subtotal, tax_amount, total } = calculateTotals(items, shipping, discount);

    updates.line_items = items;
    updates.subtotal = subtotal;
    updates.tax_amount = tax_amount;
    updates.total = total;
    updates.shipping_cost = shipping;
    updates.discount_amount = discount;
  } else {
    // Allow partial updates to shipping/discount without line_items
    if (shipping_cost !== undefined) updates.shipping_cost = shipping_cost;
    if (discount_amount !== undefined) updates.discount_amount = discount_amount;
  }

  if (customer_id !== undefined) updates.customer_id = customer_id;
  if (customer_email !== undefined) updates.customer_email = customer_email;
  if (customer_name !== undefined) updates.customer_name = customer_name;
  if (currency !== undefined) updates.currency = currency;
  if (internal_note !== undefined) updates.internal_note = internal_note;
  if (customer_note !== undefined) updates.customer_note = customer_note;
  if (repair_ticket_id !== undefined) updates.repair_ticket_id = repair_ticket_id;
  if (status !== undefined && ["draft", "sent"].includes(status)) updates.status = status;

  const { data, error } = await supabase
    .from("draft_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Verify it exists and is cancellable
  const { data: existing, error: fetchError } = await supabase
    .from("draft_orders")
    .select("status, converted_order_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Draft order not found" }, { status: 404 });
  }

  if (existing.converted_order_id) {
    return NextResponse.json(
      { error: "Cannot cancel a draft order that has already been converted to an order" },
      { status: 400 },
    );
  }

  if (existing.status === "converting") {
    return NextResponse.json(
      { error: "Cannot cancel a draft order that is currently being converted" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("draft_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Draft order cancelled" });
}
