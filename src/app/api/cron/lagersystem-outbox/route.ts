import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { drainOutbox } from "@/lib/lagersystem/outbox";
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
async function handle(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = getLagersystemClient();
  if (!client) return NextResponse.json({ skipped: "not_configured" });

  try {
    const report = await drainOutbox({ repo: createSupabaseRepairPartsRepo(createAdminClient()), client, limit: 50 });
    if (report.failed > 0) console.warn("[lagersystem-outbox] rækker markeret failed", report);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[lagersystem-outbox] kørsel fejlede", err);
    return NextResponse.json({ error: "drain failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
