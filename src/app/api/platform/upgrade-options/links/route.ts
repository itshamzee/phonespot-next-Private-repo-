// POST /api/platform/upgrade-options/links — toggle whether an upgrade option
// is offered on a given laptop template.
// body: { template_id, upgrade_option_id, enabled }
//
// Auth: handled by middleware (admin session cookie) — no auth checks here.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { template_id, upgrade_option_id, enabled } = body ?? {};

  if (!template_id || !upgrade_option_id || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "template_id, upgrade_option_id og enabled er påkrævet" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (enabled) {
    const { error } = await supabase
      .from("template_upgrade_options")
      .insert({ template_id, upgrade_option_id });
    // Ignore duplicate-key errors — the link already exists, which is the
    // desired end state.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("template_upgrade_options")
      .delete()
      .match({ template_id, upgrade_option_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
