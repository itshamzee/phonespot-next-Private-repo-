import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  getOrCreateReservationOwner,
  isDeviceId,
} from "@/lib/cart/reservation-owner";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!isDeviceId(body?.deviceId))
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const deviceId = body.deviceId;
  const supabase = createServerClient();
  const { data: device, error: readError } = await supabase
    .from("devices")
    .select("source, source_stock")
    .eq("id", deviceId)
    .maybeSingle();
  if (readError)
    return NextResponse.json(
      { error: "Lagerstatus kunne ikke hentes" },
      { status: 503 },
    );
  if (!device)
    return NextResponse.json(
      { error: "Enheden er ikke tilgængelig" },
      { status: 409 },
    );
  if (device.source === "foxway") {
    if (!(device.source_stock > 0))
      return NextResponse.json({ error: "Udsolgt" }, { status: 409 });
    return NextResponse.json({
      deviceId,
      reservedUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  }
  const owner = await getOrCreateReservationOwner();
  const { data, error } = await supabase.rpc("reserve_cart_device", {
    p_device_id: deviceId,
    p_owner_hash: owner,
  });
  if (error)
    return NextResponse.json(
      { error: "Reservation kunne ikke oprettes" },
      { status: 503 },
    );
  if (!data?.reserved)
    return NextResponse.json(
      { error: "Enheden er ikke tilgængelig" },
      { status: 409 },
    );
  return NextResponse.json({ deviceId, reservedUntil: data.reservedUntil });
}
