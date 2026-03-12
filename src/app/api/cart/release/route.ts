import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  const { deviceId } = (await req.json()) as { deviceId: string };
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "listed", reservation_expires_at: null })
    .eq("id", deviceId)
    .eq("status", "reserved")
    .select("id, status")
    .single();
  if (error || !data) {
    return NextResponse.json({ released: false });
  }
  return NextResponse.json({ released: true, deviceId: data.id });
}
