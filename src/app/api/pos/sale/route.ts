import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createPosSale } from "@/lib/pos/create-sale";

/**
 * POST /api/pos/sale
 * Create a POS sale — staff only.
 *
 * Body: {
 *   items: Array<
 *     | { type: "device", deviceId: string }
 *     | { type: "sku_product", skuProductId: string, quantity: number }
 *   >,
 *   paymentMethod: "card" | "cash" | "mobilepay",
 *   locationId: string,
 *   customerId?: string,
 *   discountAmount?: number,
 *   notes?: string,
 * }
 *
 * Returns: { orderId, orderNumber, total, receiptUrl }
 * Also returns receipt PDF as base64 for immediate printing.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("id, role, location_id")
      .eq("auth_id", user.id)
      .single();

    if (!staff) {
      return NextResponse.json(
        { error: "Kun medarbejdere kan oprette POS-salg" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items, paymentMethod, locationId, customerId, discountAmount, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Tilføj mindst ét produkt" },
        { status: 400 }
      );
    }

    if (!["card", "cash", "mobilepay"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Ugyldig betalingsmetode" },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: "Lokation mangler" },
        { status: 400 }
      );
    }

    const result = await createPosSale({
      items,
      paymentMethod,
      locationId,
      customerId,
      discountAmount,
      notes,
      staffAuthId: user.id,
    });

    return NextResponse.json({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: result.total,
      receiptPdf: result.receiptPdf.toString("base64"),
    });
  } catch (err) {
    console.error("POS sale error:", err);
    const message = err instanceof Error ? err.message : "Fejl ved oprettelse af salg";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
