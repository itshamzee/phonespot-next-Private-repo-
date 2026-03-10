import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* POST /api/trade-in/receipts/[id]/pay — mark receipt as paid */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.status !== "confirmed") {
    return NextResponse.json({ error: "Receipt must be confirmed before marking as paid" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trade_in_receipts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
