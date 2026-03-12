import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "listed", reservation_expires_at: null })
    .eq("status", "reserved")
    .lt("reservation_expires_at", now)
    .select("id");
  if (error) {
    console.error("Failed to release expired reservations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const count = data?.length ?? 0;
  console.log(`Released ${count} expired device reservations`);
  return NextResponse.json({ released: count });
}
