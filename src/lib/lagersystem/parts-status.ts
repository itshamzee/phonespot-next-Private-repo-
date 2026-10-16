import { applyPartAdded } from "./parts-check";
import type { PartsCheckRepo } from "./parts-check-run";

export function markOrdered(repo: PartsCheckRepo, ticketId: string): Promise<boolean> {
  return repo.setOrdered(ticketId);
}

/** Når delen tilføjes under "Dele brugt", ryddes mærket for netop den del. */
export async function clearShortageForPart(repo: PartsCheckRepo, ticketId: string, sku: string, now = new Date()): Promise<boolean> {
  const t = await repo.getTicket(ticketId);
  if (!t) return false;
  const next = applyPartAdded(t.parts_status, t.parts_shortage, sku);
  if (!next.changed) return false;
  await repo.saveStatus(ticketId, next.status, next.shortage, now);
  return true;
}
