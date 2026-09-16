import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadMailAgentSettings, saveMailAgentSettings } from "@/lib/mail-agent/settings";

export async function GET() {
  return NextResponse.json(await loadMailAgentSettings(createAdminClient()));
}

/** PUT { enabled?, autoSendCategories?, minConfidence? } — unknown categories are dropped. */
export async function PUT(req: NextRequest) {
  const patch = await req.json().catch(() => null);
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Ugyldigt indhold" }, { status: 400 });
  }
  return NextResponse.json(await saveMailAgentSettings(createAdminClient(), patch));
}
