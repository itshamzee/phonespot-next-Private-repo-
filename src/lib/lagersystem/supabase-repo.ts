import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepairPartRow, RepairPartsRepo, TicketRef } from "./types";

const TABLE = "repair_ticket_parts";

function fail(op: string, error: { message: string }): never {
  throw new Error(`${TABLE}.${op}: ${error.message}`);
}

export function createSupabaseRepairPartsRepo(sb: SupabaseClient): RepairPartsRepo {
  return {
    async getTicket(id) {
      const { data, error } = await sb.from("repair_tickets").select("id, store_id, ticket_number").eq("id", id).maybeSingle();
      if (error) fail("getTicket", error);
      return (data as TicketRef | null) ?? null;
    },
    async listForTicket(id) {
      const { data, error } = await sb.from(TABLE).select("*").eq("ticket_id", id).order("created_at", { ascending: true });
      if (error) fail("listForTicket", error);
      return (data as RepairPartRow[]) ?? [];
    },
    async getPart(id) {
      const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
      if (error) fail("getPart", error);
      return (data as RepairPartRow | null) ?? null;
    },
    async findReturnFor(takeId) {
      const { data, error } = await sb.from(TABLE).select("*").eq("reverses_id", takeId).maybeSingle();
      if (error) fail("findReturnFor", error);
      return (data as RepairPartRow | null) ?? null;
    },
    async insert(row, now) {
      const ts = now.toISOString();
      const { data, error } = await sb.from(TABLE).insert({ ...row, created_at: ts, pending_since: ts }).select("*").single();
      if (error?.code === "23505") return "duplicate";
      if (error) fail("insert", error);
      return data as RepairPartRow;
    },
    async voidPart(id, now) {
      const { error } = await sb.from(TABLE).update({ voided_at: now.toISOString() }).eq("id", id).is("voided_at", null);
      if (error) fail("voidPart", error);
    },
    async resetForRetry(id, now) {
      const { data, error } = await sb
        .from(TABLE)
        .update({ status: "pending", pending_since: now.toISOString(), last_attempt_at: null, last_error: null })
        .eq("id", id)
        .eq("status", "failed")
        .select("*")
        .maybeSingle();
      if (error) fail("resetForRetry", error);
      return (data as RepairPartRow | null) ?? null;
    },
    async listDue(limit, now) {
      const cutoff = new Date(now.getTime() - 30_000).toISOString();
      const { data, error } = await sb
        .from(TABLE)
        .select("*")
        .eq("status", "pending")
        .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) fail("listDue", error);
      return (data as RepairPartRow[]) ?? [];
    },
    async markSynced(id, movementId, now) {
      const ts = now.toISOString();
      const { error } = await sb.from(TABLE).update({ status: "synced", movement_id: movementId, synced_at: ts, last_attempt_at: ts, last_error: null }).eq("id", id).eq("status", "pending");
      if (error) fail("markSynced", error);
    },
    async markAttemptFailed(row, message, now) {
      const { error } = await sb
        .from(TABLE)
        .update({ attempts: row.attempts + 1, last_error: message.slice(0, 1000), last_attempt_at: now.toISOString() })
        .eq("id", row.id)
        .eq("status", "pending");
      if (error) fail("markAttemptFailed", error);
    },
    async markFailed(id, message, now) {
      const { error } = await sb
        .from(TABLE)
        .update({ status: "failed", last_error: message.slice(0, 1000), last_attempt_at: now.toISOString() })
        .eq("id", id)
        .eq("status", "pending");
      if (error) fail("markFailed", error);
    },
  };
}
