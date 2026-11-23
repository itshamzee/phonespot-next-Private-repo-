import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBuybackFollowups } from "@/lib/buyback/followup-run";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * /api/cron/buyback-followup — every hour, triggered by Supabase pg_cron
 * (supabase/migrations/20261111121000_buyback_followup_schedule.sql); Vercel
 * Hobby only allows daily crons.
 *
 * Reminders 24 h and 72 h after an offer, expiry + "vil du have et nyt bud?",
 * and "har du sendt den?" 3 and 7 days after an acceptance. Customers are only
 * contacted 9–20 Danish time. Auth: Bearer CRON_SECRET. ?dry=1 decides without
 * sending or changing anything.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const result = await runBuybackFollowups(createAdminClient(), { dryRun });
  return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
}
