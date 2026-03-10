import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { SlutseddelDocument } from "@/lib/pdf/slutseddel";

/* GET /api/trade-in/receipts/[id]/pdf — generate and return PDF */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("trade_in_receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(SlutseddelDocument, {
      receipt,
      items: items || [],
    }) as any,
  );

  return new Response(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Slutseddel-${receipt.receipt_number}.pdf"`,
    },
  });
}
