import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadMailboxes } from "@/lib/mail-agent/config";

/** GET /api/admin/mail-agent/status — last run, pending drafts, configured mailboxes. */
export async function GET() {
  const sb = createAdminClient();
  const [{ data: lastRun }, { count: pending }, { count: needsHuman }] = await Promise.all([
    sb.from("mail_agent_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("ai_drafts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("ai_drafts").select("id", { count: "exact", head: true }).eq("status", "pending").eq("needs_human", true),
  ]);

  return NextResponse.json({
    mailboxes: loadMailboxes().map((b) => b.address),
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
    lastRun,
    pending: pending ?? 0,
    needsHuman: needsHuman ?? 0,
  });
}
