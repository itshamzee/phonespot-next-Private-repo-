import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { statistics, marketing, preferences, stamp } = body;

    const supabase = createServerClient();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const entries = [
      { consent_type: "cookies_statistics", granted: Boolean(statistics) },
      { consent_type: "cookies_marketing", granted: Boolean(marketing) },
      { consent_type: "cookies_preferences", granted: Boolean(preferences) },
    ];

    const rows = entries.map((entry) => ({
      session_id: stamp || null,
      consent_type: entry.consent_type,
      granted: entry.granted,
      granted_at: new Date().toISOString(),
      withdrawn_at: entry.granted ? null : new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent,
    }));

    const { error } = await supabase.from("consent_log").insert(rows);

    if (error) {
      console.error("Failed to log consent:", error);
      return NextResponse.json({ error: "Failed to log consent" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
