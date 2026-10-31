import { CLOSED_TICKET_STATUSES, type TakenRow } from "../parts-check";
import type { PartsCheckRepo, TicketForCheck } from "../parts-check-run";
import type { ServicePartLink } from "../types";

export function memoryPartsCheckRepo(init: { tickets: TicketForCheck[]; links: ServicePartLink[]; taken?: TakenRow[] }) {
  const tickets = init.tickets.map((t) => ({ ...t }));
  const find = (id: string) => {
    const t = tickets.find((x) => x.id === id);
    if (!t) throw new Error(`no ticket ${id}`);
    return t;
  };
  const closed = (s: string) => (CLOSED_TICKET_STATUSES as readonly string[]).includes(s);
  const repo: PartsCheckRepo & { tickets: TicketForCheck[]; saves: number } = {
    tickets,
    saves: 0,
    async getTicket(id) { return tickets.find((t) => t.id === id) ?? null; },
    async getLinks(ids) { return init.links.filter((l) => ids.includes(l.service_id)); },
    async getOtherOpenTickets(storeIds, excludeId) {
      return tickets.filter((t) => t.id !== excludeId && t.store_id !== null && storeIds.includes(t.store_id) && !closed(t.status));
    },
    async getTaken(skus) { return (init.taken ?? []).filter((r) => skus.includes(r.shared_sku)); },
    async saveStatus(id, status, shortage) { Object.assign(find(id), { parts_status: status, parts_shortage: shortage }); repo.saves++; },
    async claimNotification(id, key) { const t = find(id); if (t.parts_notified_key === key) return false; t.parts_notified_key = key; return true; },
    async releaseNotification(id, key) { const t = find(id); if (t.parts_notified_key === key) t.parts_notified_key = null; },
    async clearNotification(id) { find(id).parts_notified_key = null; },
    async listRecheckOpen(limit) { return tickets.filter((t) => (t.parts_status === "unknown" || (t.parts_status === "needs_order" && t.parts_notified_key === null)) && !closed(t.status)).slice(0, limit).map((t) => t.id); },
    async setOrdered(id) { const t = find(id); if (t.parts_status !== "needs_order") return false; t.parts_status = "ordered"; return true; },
  };
  return repo;
}
