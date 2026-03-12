import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

const RESERVATION_TTL_MINUTES = 15;

export async function POST(req: NextRequest) {
  const { deviceId } = (await req.json()) as { deviceId: string };
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "reserved", reservation_expires_at: expiresAt })
    .eq("id", deviceId)
    .eq("status", "listed")
    .select("id, status, reservation_expires_at")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Device not available for reservation" }, { status: 409 });
  }
  return NextResponse.json({ deviceId: data.id, reservedUntil: data.reservation_expires_at });
}
