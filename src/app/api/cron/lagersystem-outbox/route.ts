import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { drainOutbox } from "@/lib/lagersystem/outbox";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { recheckUnknownTickets } from "@/lib/lagersystem/parts-check-run";
import { notifyPartsShortage } from "@/lib/lagersystem/shortage-mail";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";
import { pollRequestedTransfers, syncOpenTicketTransfers } from "@/lib/lagersystem/ticket-transfers";
import { createSupabaseTicketTransfersRepo } from "@/lib/lagersystem/ticket-transfers-repo";
import { sendTransferRequestMail } from "@/lib/lagersystem/transfer-mail";

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
  // Spec §3.5 "Besked": anmodninger oprettet andre steder ses kun ved at spørge.
  // Én mail pr. flytnings-id (lager_transfer_notifications).
  const links = createSupabaseTicketTransfersRepo(sb);
  let transfer_mails: number | null = null;
  try {
    transfer_mails = await pollRequestedTransfers({ client, links, send: sendTransferRequestMail });
  } catch (err) {
    console.error("[lagersystem-outbox] polling af anmodninger fejlede", err);
  }
  // Mærket Anmodet/Undervejs følger flytninger, som andre har handlet på.
  let ticket_transfers_synced: number | null = null;
  try {
    ticket_transfers_synced = await syncOpenTicketTransfers({ parts: createSupabasePartsCheckRepo(sb), links, client, limit: 50 });
  } catch (err) {
    console.error("[lagersystem-outbox] synk af sagsflytninger fejlede", err);
  }
  return NextResponse.json({ ...report, rechecked, transfer_mails, ticket_transfers_synced });
}

export const GET = handle;
export const POST = handle;
