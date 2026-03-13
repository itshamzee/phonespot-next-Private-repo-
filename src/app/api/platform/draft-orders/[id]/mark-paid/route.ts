// POST /api/platform/draft-orders/[id]/mark-paid
// Converts a draft order directly to a confirmed order (cash/bank transfer payments).
// Bypasses Stripe — calls convertDraftToOrder() directly.

import { NextResponse } from "next/server";
import { convertDraftToOrder } from "@/lib/draft-orders/convert";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const order = await convertDraftToOrder(id);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[mark-paid] Failed to convert draft order ${id}:`, message);

    // Return appropriate status based on error type
    if (
      message.includes("not found") ||
      message.includes("already been converted") ||
      message.includes("already been processed") ||
      message.includes("cancelled") ||
      message.includes("already being converted")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
