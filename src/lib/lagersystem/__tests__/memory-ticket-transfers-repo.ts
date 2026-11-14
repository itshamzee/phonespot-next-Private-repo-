import type { TicketTransferLink, TicketTransfersRepo } from "../ticket-transfers";

export function memoryTicketTransfersRepo(initial: TicketTransferLink[] = []) {
  const rows = initial.map((r) => ({ ...r }));
  const mailed = new Set<string>();
  const repo: TicketTransfersRepo & { rows: TicketTransferLink[]; mailed: Set<string> } = {
    rows, mailed,
    async listForTicket(ticketId) { return rows.filter((r) => r.ticket_id === ticketId); },
    async insert(link) { if (rows.some((r) => r.transfer_id === link.transfer_id)) return "duplicate"; rows.push({ ...link }); return "ok"; },
    async listOpen(limit) { return rows.filter((r) => ["REQUESTED", "SENT", "PARTIALLY_RECEIVED"].includes(r.status)).slice(0, limit); },
    async setStatus(id, status) { const hit = rows.filter((r) => r.transfer_id === id); hit.forEach((r) => { r.status = status; }); return hit; },
    async claimMail(id) { if (mailed.has(id)) return false; mailed.add(id); return true; },
    async releaseMail(id) { mailed.delete(id); },
  };
  return repo;
}
