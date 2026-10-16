import type { NewRepairPartRow, RepairPartRow, RepairPartsRepo, TicketRef } from "../types";

export function memoryRepo(tickets: TicketRef[] = []) {
  const rows: RepairPartRow[] = [];
  const byId = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new Error(`no row ${id}`);
    return r;
  };
  const repo: RepairPartsRepo & { rows: RepairPartRow[]; tickets: TicketRef[] } = {
    rows,
    tickets,
    async getTicket(id) { return tickets.find((t) => t.id === id) ?? null; },
    async listForTicket(id) { return rows.filter((r) => r.ticket_id === id); },
    async getPart(id) { return rows.find((r) => r.id === id) ?? null; },
    async findReturnFor(takeId) { return rows.find((r) => r.reverses_id === takeId) ?? null; },
    async insert(row: NewRepairPartRow, now) {
      if (rows.some((r) => r.idempotency_key === row.idempotency_key || (row.reverses_id !== null && r.reverses_id === row.reverses_id))) return "duplicate";
      const ts = now.toISOString();
      const full: RepairPartRow = { ...row, status: "pending", movement_id: null, created_at: ts, voided_at: null, pending_since: ts, attempts: 0, last_attempt_at: null, last_error: null, synced_at: null };
      rows.push(full);
      return full;
    },
    async voidPart(id, now) { const r = byId(id); if (!r.voided_at) r.voided_at = now.toISOString(); },
    async voidFailedPart(id, now) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.status !== "failed" || r.voided_at) return false;
      r.voided_at = now.toISOString();
      return true;
    },
    async resetForRetry(id, now) {
      const r = rows.find((x) => x.id === id && x.status === "failed");
      if (!r) return null;
      Object.assign(r, { status: "pending", attempts: 0, pending_since: now.toISOString(), last_attempt_at: null, last_error: null });
      return r;
    },
    async listDue(limit, now) {
      const cutoff = now.getTime() - 30_000;
      return rows
        .filter((r) => r.status === "pending" && (!r.last_attempt_at || new Date(r.last_attempt_at).getTime() < cutoff))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, limit);
    },
    async markSynced(id, movementId, now) {
      if (byId(id).status !== "pending") return;
      Object.assign(byId(id), { status: "synced", movement_id: movementId, synced_at: now.toISOString(), last_attempt_at: now.toISOString(), last_error: null });
    },
    async markAttemptFailed(row, error, now) {
      if (byId(row.id).status !== "pending") return;
      Object.assign(byId(row.id), { attempts: row.attempts + 1, last_error: error, last_attempt_at: now.toISOString() });
    },
    async markFailed(id, error, now) {
      if (byId(id).status !== "pending") return;
      Object.assign(byId(id), { status: "failed", last_error: error, last_attempt_at: now.toISOString() });
    },
  };
  return repo;
}
