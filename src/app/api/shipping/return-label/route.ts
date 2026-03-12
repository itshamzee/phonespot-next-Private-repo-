import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShipment } from "@/lib/shipmondo/client";
import { SENDER_ADDRESSES, DEFAULT_PARCEL } from "@/lib/shipmondo/carriers";

export async function POST(request: NextRequest) {
  const { order_id, reason } = await request.json();
  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, customer:customers(*)")
    .eq("id", order_id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const address = order.shipping_address as any;
  if (!address) {
    return NextResponse.json(
      { error: "No shipping address on order" },
      { status: 400 }
    );
  }

  // Return label: customer is sender, PhoneSpot Slagelse is receiver
  const receiver = SENDER_ADDRESSES.slagelse;

  try {
    const shipment = await createShipment({
      carrier_code: "gls",
      product_code: "GLSDK_SD",
      sender: {
        name: address.name || order.customer?.name || "",
        address1: address.address1,
        zipcode: address.zipcode,
        city: address.city,
        country_code: "DK",
        email: order.customer?.email,
      },
      receiver,
      parcels: [DEFAULT_PARCEL],
      reference: `RETUR-${order.order_number}`,
    });

    // Log activity
    await supabase.from("activity_log").insert({
      action: "return_label_created",
      entity_type: "order",
      entity_id: order_id,
      details: {
        reason,
        tracking_number: shipment.tracking_number,
      },
    });

    return NextResponse.json({
      tracking_number: shipment.tracking_number,
      label_url: shipment.label_url,
    });
  } catch (err) {
    console.error("Return label generation failed:", err);
    return NextResponse.json(
      { error: "Kunne ikke oprette returlabel" },
      { status: 502 }
    );
  }
}
