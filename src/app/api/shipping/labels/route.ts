import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShipment } from "@/lib/shipmondo/client";
import { SENDER_ADDRESSES, DEFAULT_PARCEL } from "@/lib/shipmondo/carriers";
import { trackingUrlFor } from "@/lib/shipmondo/carriers";
import { pickupCarrierProduct } from "@/lib/shipping";
import { getShippingOption, getDispatchLocation, isClickCollect } from "@/lib/shipping";
import type { ShippingMethod, ShipmondoShipmentRequest } from "@/lib/shipmondo/types";

export async function POST(request: NextRequest) {
  const { order_id } = await request.json();
  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(*),
      items:order_items(*, device:devices(location_id))
    `)
    .eq("id", order_id)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.tracking_number) {
    return NextResponse.json(
      { error: "Label already generated", tracking_number: order.tracking_number },
      { status: 409 }
    );
  }

  const method = order.shipping_method as ShippingMethod;

  if (isClickCollect(method)) {
    return NextResponse.json(
      { error: "Click & collect orders do not need shipping labels" },
      { status: 400 }
    );
  }

  const option = getShippingOption(method);
  if (!option) {
    return NextResponse.json(
      { error: `Unknown shipping method: ${method}` },
      { status: 400 }
    );
  }

  // With "pakkeshop" the carrier follows the shop the customer chose, so the
  // product cannot be read off the method alone — resolve it before deciding
  // whether the method is bookable at all.
  const pickup = order.pickup_point as { id?: string; carrier_code?: string } | null;
  const product = pickup?.carrier_code
    ? pickupCarrierProduct(pickup.carrier_code)
    : { carrier_code: option.carrier_code, product_code: option.product_code };

  if (!product.carrier_code || !product.product_code) {
    return NextResponse.json(
      { error: `Ingen transportør for metoden "${method}" — ordren mangler pakkeshop-data` },
      { status: 400 }
    );
  }

  if (option.requires_pickup_point && !pickup?.id) {
    return NextResponse.json(
      { error: "Ordren mangler en valgt pakkeshop" },
      { status: 400 },
    );
  }

  const firstDeviceLocation = order.items?.find(
    (i: any) => i.device?.location_id
  )?.device?.location_id;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .in("type", ["store", "warehouse"]);

  const locationMap: Record<string, string> = {};
  for (const loc of locations ?? []) {
    const key = loc.name.toLowerCase().includes("vejle") ? "vejle" : "slagelse";
    locationMap[loc.id] = key;
  }

  const dispatchFrom = getDispatchLocation(firstDeviceLocation, locationMap);
  const sender = SENDER_ADDRESSES[dispatchFrom];
  const address = order.shipping_address as any;

  const shipmentReq: ShipmondoShipmentRequest = {
    carrier_code: product.carrier_code as string,
    product_code: product.product_code as string,
    sender,
    receiver: {
      name: address.name || order.customer?.name || "",
      address1: address.line1 || address.address1 || "",
      address2: address.line2 || address.address2 || "",
      zipcode: address.postal_code || address.zipcode || "",
      city: address.city || "",
      country_code: address.country || address.country_code || "DK",
      email: order.customer?.email,
      phone: order.customer?.phone,
    },
    parcels: [DEFAULT_PARCEL],
    service_point_id: pickup?.id ?? address.pickup_point_id,
    reference: order.order_number,
  };

  try {
    const shipment = await createShipment(shipmentReq);

    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        tracking_number: shipment.pkg_no,
        status: "shipped",
        shipped_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateErr) {
      console.error("Failed to update order with tracking:", updateErr);
    }

    await supabase.from("activity_log").insert({
      action: "shipping_label_created",
      entity_type: "order",
      entity_id: order_id,
      details: {
        tracking_number: shipment.pkg_no,
        carrier: product.carrier_code,
        dispatch_location: dispatchFrom,
      },
    });

    return NextResponse.json({
      tracking_number: shipment.pkg_no,
      tracking_url: trackingUrlFor(product.carrier_code as string, shipment.pkg_no),
      shipment_id: shipment.id,
    });
  } catch (error) {
    console.error("Shipmondo label generation failed:", error);
    return NextResponse.json(
      { error: "Kunne ikke oprette forsendelse. Prøv igen." },
      { status: 502 }
    );
  }
}
