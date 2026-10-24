import type { SupabaseClient } from "@supabase/supabase-js";
import type { TicketTransferLink, TicketTransfersRepo } from "./ticket-transfers";

const COLS = "transfer_id, ticket_id, shared_sku, from_location, qty, status";
function fail(op: string, error: { message: string }): never {
  throw new Error(`ticket-transfers.${op}: ${error.message}`);
}

export function createSupabaseTicketTransfersRepo(sb: SupabaseClient): TicketTransfersRepo {
  return {
    async listForTicket(ticketId) {
      const { data, error } = await sb.from("repair_ticket_transfers").select(COLS).eq("ticket_id", ticketId).order("created_at");
      if (error) fail("listForTicket", error);
      return (data as TicketTransferLink[]) ?? [];
    },
    async insert(link) {
      const { error } = await sb.from("repair_ticket_transfers").insert(link);
      if (error?.code === "23505") return "duplicate";
      if (error) fail("insert", error);
      return "ok";
    },
    async listOpen(limit) {
      const { data, error } = await sb
        .from("repair_ticket_transfers")
        .select(COLS)
        .in("status", ["REQUESTED", "SENT", "PARTIALLY_RECEIVED"])
        .order("updated_at", { ascending: true })
        .limit(limit);
      if (error) fail("listOpen", error);
      return (data as TicketTransferLink[]) ?? [];
    },
    async setStatus(transferId, status) {
      const { data, error } = await sb
        .from("repair_ticket_transfers")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("transfer_id", transferId)
        .select(COLS);
      if (error) fail("setStatus", error);
      return (data as TicketTransferLink[]) ?? [];
    },
    async claimMail(transferId) {
      const { error } = await sb.from("lager_transfer_notifications").insert({ transfer_id: transferId });
      if (error?.code === "23505") return false;
      if (error) fail("claimMail", error);
      return true;
    },
    async releaseMail(transferId) {
      const { error } = await sb.from("lager_transfer_notifications").delete().eq("transfer_id", transferId);
      if (error) fail("releaseMail", error);
    },
  };
}
