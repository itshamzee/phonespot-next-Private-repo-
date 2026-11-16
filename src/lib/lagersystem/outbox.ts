import { LagersystemError, type LagersystemClient } from "./client";
import type { RepairPartRow, RepairPartsRepo } from "./types";

/** Spec §4.2: efter 24 timer med fejl bliver status 'failed'. */
export const FAIL_AFTER_MS = 24 * 60 * 60 * 1000;

export type SendOutcome = "synced" | "retry" | "failed" | "waiting";

export interface OutboxDeps {
  repo: RepairPartsRepo;
  client: Pick<LagersystemClient, "postMovement">;
  now: Date;
}

/**
 * Sender én række. Idempotent: samme idempotency_key to gange giver
 * `replayed: true` fra lagersystemet, så after() og cron kan godt ramme
 * samme række samtidig.
 */
export async function sendRepairPart(
  row: RepairPartRow,
  { repo, client, now }: OutboxDeps,
  unreachable?: Set<string>,
): Promise<SendOutcome> {
  if (row.status !== "pending") return row.status === "synced" ? "synced" : "failed";

  if (row.movement_type === "RETURN") {
    const take = row.reverses_id ? await repo.getPart(row.reverses_id) : null;
    if (!take || take.status === "failed") {
      await repo.markFailed(row.id, "Udtaget blev aldrig bogført – intet at returnere", now);
      return "failed";
    }
    if (take.status !== "synced") return "waiting";
  }

  try {
    const { movement } = await client.postMovement({
      idempotency_key: row.idempotency_key,
      location: row.location_code,
      shared_sku: row.shared_sku,
      type: row.movement_type,
      qty: row.qty,
      actor_label: row.actor_label,
      reference: row.reference,
    });
    await repo.markSynced(row.id, movement.id, now);
    return "synced";
  } catch (err) {
    const e = err instanceof LagersystemError ? err : new LagersystemError(0, "network", err instanceof Error ? err.message : String(err));
    if (e.status === 0) unreachable?.add(row.id);
    const message = `${e.code} (${e.status}): ${e.message}`;
    const expired = now.getTime() - new Date(row.pending_since).getTime() >= FAIL_AFTER_MS;
    if (!e.retryable || expired) {
      await repo.markFailed(row.id, message, now);
      return "failed";
    }
    await repo.markAttemptFailed(row, message, now);
    return "retry";
  }
}

/** Kører i rækkefølge (ældste først), så en TAKE altid sendes før sin RETURN. */
export async function drainOutbox({
  repo,
  client,
  now = () => new Date(),
  limit = 50,
}: {
  repo: RepairPartsRepo;
  client: Pick<LagersystemClient, "postMovement">;
  now?: () => Date;
  limit?: number;
}): Promise<Record<SendOutcome, number>> {
  const report: Record<SendOutcome, number> = { synced: 0, retry: 0, failed: 0, waiting: 0 };
  const rows = await repo.listDue(limit, now());
  const unreachable = new Set<string>();
  for (const row of rows) {
    report[await sendRepairPart(row, { repo, client, now: now() }, unreachable)]++;
    // Lagersystemet svarer ikke (netværk/timeout): stop, så cronens øvrige trin når at køre inden for 60 s.
    if (unreachable.has(row.id)) break;
  }
  return report;
}
