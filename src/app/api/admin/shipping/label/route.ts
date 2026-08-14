import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LABEL_BUCKET, labelStoragePath } from "@/lib/shipmondo/label-storage";

/**
 * Streams a booked shipping label PDF to staff. Lives under /api/admin/** so
 * the middleware staff gate applies — labels carry customer name and address.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, tracking_number")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Ordre ikke fundet" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from(LABEL_BUCKET)
    .download(labelStoragePath(order.order_number));

  if (error || !file) {
    return NextResponse.json(
      {
        error: order.tracking_number
          ? "Ingen gemt label for denne ordre — den er oprettet før label-arkivet fandtes"
          : "Ordren har ingen pakkelabel endnu",
      },
      { status: 404 },
    );
  }

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.order_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
