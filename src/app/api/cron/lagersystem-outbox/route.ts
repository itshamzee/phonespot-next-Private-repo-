import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { drainOutbox } from "@/lib/lagersystem/outbox";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { recheckUnknownTickets } from "@/lib/lagersystem/parts-check-run";
import { notifyPartsShortage } from "@/lib/lagersystem/shortage-mail";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * /api/cron/lagersystem-outbox — hvert minut, udløst af Supabase pg_cron
 * (supabase/migrations/20261013_lagersystem_outbox_schedule.sql), samme mønster
 * som mail-agenten (Vercel Hobby tillader kun daglige crons).
 * Sender ventende "Dele brugt"-bevægelser; efter 24 t uden held → 'failed'.
 * Auth: Bearer CRON_SECRET.
 */
const sha = (v: string) => createHash("sha256").update(v).digest();

/** Lukker altid hvis CRON_SECRET mangler; sammenligner i konstant tid. */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEqual(sha(req.headers.get("authorization") ?? ""), sha(`Bearer ${secret}`));
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = getLagersystemClient();
  if (!client) return NextResponse.json({ skipped: "not_configured" });

  const sb = createAdminClient();
  let report: Awaited<ReturnType<typeof drainOutbox>>;
  try {
    report = await drainOutbox({ repo: createSupabaseRepairPartsRepo(sb), client, limit: 50 });
    if (report.failed > 0) console.warn("[lagersystem-outbox] rækker markeret failed", report);
  } catch (err) {
    console.error("[lagersystem-outbox] kørsel fejlede", err);
    return NextResponse.json({ error: "drain failed" }, { status: 500 });
  }
  // Spec §4.4: sager med parts_status 'unknown' tjekkes igen, når lagersystemet svarer.
  let rechecked: number | null = null;
  try {
    rechecked = await recheckUnknownTickets({ repo: createSupabasePartsCheckRepo(sb), client, notify: notifyPartsShortage, limit: 20 });
  } catch (err) {
    console.error("[lagersystem-outbox] gentjek af lagerstatus fejlede", err);
  }
  return NextResponse.json({ ...report, rechecked });
}

export const GET = handle;
export const POST = handle;
