import type { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "./events";
import { sendCriticalAlert } from "./alerts";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const MAX_CATALOG_AGE_DAYS = 3;

// Parts prices drive every fault deduction. A stale catalog means offers that are
// quietly wrong, which is worse than no offers at all — so automation stops
// rather than carrying on with numbers nobody has checked.
export function catalogStaleReason(lastSyncedAt: string | null, now: Date): string | null {
  if (!lastSyncedAt) return "Foneday-kataloget er aldrig synkroniseret";

  const parsed = new Date(lastSyncedAt);
  if (Number.isNaN(parsed.getTime())) return "Foneday-kataloget har ingen gyldig synk-dato";

  const ageDays = Math.floor((now.getTime() - parsed.getTime()) / 86_400_000);
  if (ageDays > MAX_CATALOG_AGE_DAYS) {
    return `Foneday-kataloget er ${ageDays} dage gammelt`;
  }
  return null;
}

// The freshest row in the catalog is the honest signal: it is written by the
// sync itself, so it cannot claim success the sync did not have.
export async function catalogLastSyncedAt(client: SupabaseAdmin): Promise<string | null> {
  const { data } = await client
    .from("foneday_catalog")
    .select("last_synced_at")
    .order("last_synced_at", { ascending: false })
    .limit(1);

  const row = ((data ?? []) as { last_synced_at: string | null }[])[0];
  return row?.last_synced_at ?? null;
}

async function readSettingsValue(client: SupabaseAdmin): Promise<Record<string, unknown>> {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", "buyback")
    .maybeSingle();
  return ((data as { value?: unknown } | null)?.value ?? {}) as Record<string, unknown>;
}

export async function pauseAutomation(client: SupabaseAdmin, reason: string): Promise<void> {
  const value = await readSettingsValue(client);
  if (value.pausedReason === reason) return; // already paused for this reason

  await client
    .from("app_settings")
    .upsert({ key: "buyback", value: { ...value, pausedReason: reason } }, { onConflict: "key" });

  await logBuybackEvent(client, {
    type: "paused",
    severity: "critical",
    summary: `Automatikken er sat på pause: ${reason}`,
  });

  // A pause that only shows up in a feed nobody has open is a silent pause.
  await sendCriticalAlert(client, `automatikken er sat på pause — ${reason}`);
}

export async function resumeAutomation(client: SupabaseAdmin): Promise<void> {
  const value = await readSettingsValue(client);

  await client
    .from("app_settings")
    .upsert({ key: "buyback", value: { ...value, pausedReason: null } }, { onConflict: "key" });

  await logBuybackEvent(client, {
    type: "resumed",
    severity: "info",
    summary: "Automatikken er genstartet",
  });
}
