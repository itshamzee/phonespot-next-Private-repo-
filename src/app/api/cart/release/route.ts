import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { readReservationOwner, isDeviceId } from "@/lib/cart/reservation-owner";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!isDeviceId(body?.deviceId))
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  const owner = await readReservationOwner();
  if (!owner) return NextResponse.json({ released: false });
  const { data, error } = await createServerClient().rpc(
    "release_cart_device",
    { p_device_id: body.deviceId, p_owner_hash: owner },
  );
  if (error)
    return NextResponse.json(
      { error: "Reservation kunne ikke frigives" },
      { status: 503 },
    );
  return NextResponse.json(
    data?.released
      ? { released: true, deviceId: body.deviceId }
      : { released: false },
  );
}
