import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMorningDigest } from "@/lib/mail-agent/digest";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * /api/cron/mail-digest — morgenoverblikket til ejeren, én gang om dagen via
 * Supabase pg_cron (supabase/migrations/20261113091000_mail_digest_schedule.sql).
 * Auth: Bearer CRON_SECRET. ?dry=1 returnerer mailen uden at sende den.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendMorningDigest(createAdminClient(), { dryRun: req.nextUrl.searchParams.get("dry") === "1" });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
