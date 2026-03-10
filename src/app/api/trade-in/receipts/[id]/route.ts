import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* PATCH /api/trade-in/receipts/[id] — update draft receipt */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { items, ...receiptFields } = body;

  const supabase = createServerClient();

  // Check receipt exists and is draft
  const { data: existing } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Can only edit draft receipts" }, { status: 400 });
  }

  // Update receipt fields
  if (Object.keys(receiptFields).length > 0) {
    // Recalculate total if items provided
    if (items && Array.isArray(items)) {
      receiptFields.total_amount = items.reduce((sum: number, i: { price: number }) => sum + i.price, 0);
    }
    const { error } = await supabase
      .from("trade_in_receipts")
      .update(receiptFields)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace items if provided
  if (items && Array.isArray(items)) {
    // Delete existing items
    await supabase.from("trade_in_receipt_items").delete().eq("receipt_id", id);
    // Insert new items
    const itemRows = items.map((item: any) => ({
      receipt_id: id,
      imei_serial: item.imei_serial || null,
      brand: item.brand,
      model: item.model,
      storage: item.storage || null,
      ram: item.ram || null,
      condition_grade: item.condition_grade || null,
      color: item.color || null,
      condition_notes: item.condition_notes || null,
      price: item.price,
    }));
    await supabase.from("trade_in_receipt_items").insert(itemRows);
  }

  // Return updated receipt
  const { data } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(data);
}

/* DELETE /api/trade-in/receipts/[id] — delete draft only */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Can only delete draft receipts" }, { status: 400 });
  }

  await supabase.from("trade_in_receipts").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
