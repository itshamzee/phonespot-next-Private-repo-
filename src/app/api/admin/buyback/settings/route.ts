import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { requireStaff } from "@/lib/auth/require-staff";
import { resumeAutomation } from "@/lib/buyback/pause";

/* GET — the merged settings (defaults + stored overrides) */
export async function GET(req: Request) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  return NextResponse.json(await loadBuybackSettings(supabase));
}

/* PATCH — merge a partial settings object into app_settings.key = 'buyback' */
export async function PATCH(req: Request) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patch = (await req.json()) as Record<string, unknown>;
  const supabase = createAdminClient();

  // Clearing the pause is a decision worth recording, not a silent field edit.
  if ("pausedReason" in patch && patch.pausedReason === null) {
    await resumeAutomation(supabase);
    delete patch.pausedReason;
  }

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "buyback")
    .maybeSingle();

  const current = ((data as { value?: unknown } | null)?.value ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "buyback", value: { ...current, ...patch }, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(await loadBuybackSettings(supabase));
}
