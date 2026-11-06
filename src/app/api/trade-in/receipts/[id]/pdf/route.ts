import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { SlutseddelDocument } from "@/lib/pdf/slutseddel";
import { timingSafeEqual } from "node:crypto";
import { requireStaff } from "@/lib/auth/require-staff";

/** The confirm route renders the PDF through this route with the service key. */
function isInternalCall(req: Request): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sent = req.headers.get("x-internal-key");
  if (!key || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* GET /api/trade-in/receipts/[id]/pdf — generate and return PDF */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isInternalCall(req) && !(await requireStaff(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
