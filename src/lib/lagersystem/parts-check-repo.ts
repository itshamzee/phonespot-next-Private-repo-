import type { SupabaseClient } from "@supabase/supabase-js";
import { CLOSED_TICKET_STATUSES, type OpenTicketShape, type TakenRow } from "./parts-check";
import type { PartsCheckRepo, TicketForCheck } from "./parts-check-run";
import type { ServicePartLink } from "./types";

const CLOSED = `(${CLOSED_TICKET_STATUSES.join(",")})`;
const TICKET_COLS =
  "id, store_id, status, parts_status, parts_shortage, parts_notified_key, ticket_number, device_model, customer_name, booking_details, services, paid, stripe_session_id, created_at";

function fail(op: string, error: { message: string }): never {
  throw new Error(`parts-check.${op}: ${error.message}`);
}

export function createSupabasePartsCheckRepo(sb: SupabaseClient): PartsCheckRepo {
  return {
    async getTicket(id) {
      const { data, error } = await sb.from("repair_tickets").select(TICKET_COLS).eq("id", id).maybeSingle();
      if (error) fail("getTicket", error);
      return (data as TicketForCheck | null) ?? null;
    },
    async getLinks(serviceIds) {
      if (serviceIds.length === 0) return [];
      const { data, error } = await sb.from("repair_service_shared_parts").select("service_id, shared_sku, qty, part_name").in("service_id", serviceIds);
      if (error) fail("getLinks", error);
      return (data as ServicePartLink[]) ?? [];
    },
    async getOtherOpenTickets(storeIds, excludeId) {
      if (storeIds.length === 0) return [];
      const { data, error } = await sb
        .from("repair_tickets")
        .select("id, booking_details, services, paid, stripe_session_id, created_at")
        .in("store_id", storeIds)
        .not("status", "in", CLOSED)
        .neq("id", excludeId)
        .limit(1000);
      if (error) fail("getOtherOpenTickets", error);
      return (data as OpenTicketShape[]) ?? [];
    },
    async getTaken(skus) {
      if (skus.length === 0) return [];
      const { data, error } = await sb
        .from("repair_ticket_parts")
        .select("ticket_id, shared_sku, qty")
        .eq("movement_type", "TAKE")
        .is("voided_at", null)
        .neq("status", "failed")
        .in("shared_sku", skus);
      if (error) fail("getTaken", error);
      return (data as TakenRow[]) ?? [];
    },
    async saveStatus(id, status, shortage, now) {
      const { error } = await sb
        .from("repair_tickets")
        .update({ parts_status: status, parts_shortage: shortage, parts_checked_at: now.toISOString() })
        .eq("id", id);
      if (error) fail("saveStatus", error);
    },
    async claimNotification(id, key) {
      const { data, error } = await sb
        .from("repair_tickets")
        .update({ parts_notified_key: key })
        .eq("id", id)
        .or(`parts_notified_key.is.null,parts_notified_key.neq.${key}`)
        .select("id");
      if (error) fail("claimNotification", error);
      return (data ?? []).length > 0;
    },
    async releaseNotification(id, key) {
      const { error } = await sb.from("repair_tickets").update({ parts_notified_key: null }).eq("id", id).eq("parts_notified_key", key);
      if (error) fail("releaseNotification", error);
    },
    async listUnknownOpen(limit) {
      const { data, error } = await sb
        .from("repair_tickets")
        .select("id")
        .eq("parts_status", "unknown")
        .not("status", "in", CLOSED)
        .order("parts_checked_at", { ascending: true })
        .limit(limit);
      if (error) fail("listUnknownOpen", error);
      return ((data as { id: string }[]) ?? []).map((r) => r.id);
    },
    async setOrdered(id) {
      const { data, error } = await sb
        .from("repair_tickets")
        .update({ parts_status: "ordered" })
        .eq("id", id)
        .eq("parts_status", "needs_order")
        .select("id");
      if (error) fail("setOrdered", error);
      return (data ?? []).length > 0;
    },
  };
}
