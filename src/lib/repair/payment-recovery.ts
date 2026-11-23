import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gendannelse af afbrudt Stripe-betaling for reparationsbookinger.
 *
 * Ved "Betal nu" oprettes sagen før betalingen. Afbryder kunden i Stripe, står
 * sagen ubetalt og bliver til sidst arkiveret af personalet. Cancel-linket
 * bærer en tilfældig nøgle (kun hashen ligger på sagen), og med den kan kunden
 * gøre den SAMME sag til en almindelig booking med betaling i butikken, eller
 * prøve at betale igen. Sags-id alene er ikke nok.
 */

export const PAY_IN_STORE_LOG_NOTE =
  "Kunden afbrød onlinebetalingen og valgte i stedet at betale i butikken. Sagen er nu en almindelig booking.";

export function hashRecoveryToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newRecoveryToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashRecoveryToken(token) };
}

/** Felter der stemples på booking_details, når sagen oprettes med Stripe-betaling. */
export function onlinePaymentFields(hash: string) {
  return { payment_flow: "online" as const, recovery_token_hash: hash };
}

export function tokenMatches(token: string, storedHash: unknown): boolean {
  if (typeof storedHash !== "string" || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  if (typeof token !== "string" || token.length < 16 || token.length > 200) return false;
  const a = Buffer.from(hashRecoveryToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type RecoveryTicket = {
  id: string;
  ticket_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string | null;
  device_model: string | null;
  issue_description: string | null;
  store_id: string | null;
  status: string;
  paid: boolean | null;
  booking_details: Record<string, unknown> | null;
};

export const RECOVERY_COLUMNS =
  "id, ticket_number, customer_name, customer_email, customer_phone, device_type, device_model, issue_description, store_id, status, paid, booking_details";

export type RecoveryLookup =
  | { ok: true; tickets: RecoveryTicket[]; alreadyInStore: boolean; sessionId: string | null }
  | { ok: false; reason: "invalid" | "paid" | "closed" };

/**
 * Finder bookingens sager (alle enheder i en gruppe) og kontrollerer, at nøglen
 * passer, at ingen er betalt, og at ingen er annulleret/modtaget af personalet.
 * Ukendt sag og forkert nøgle giver samme svar, så id'er ikke kan afprøves.
 */
export async function lookupRecoverableTickets(
  supabase: SupabaseClient,
  ticketId: unknown,
  token: unknown,
): Promise<RecoveryLookup> {
  if (!isUuid(ticketId) || typeof token !== "string") return { ok: false, reason: "invalid" };
  const { data: first } = await supabase
    .from("repair_tickets")
    .select(RECOVERY_COLUMNS)
    .eq("id", ticketId)
    .maybeSingle();
  const head = first as RecoveryTicket | null;
  if (!head || !tokenMatches(token, head.booking_details?.recovery_token_hash)) {
    return { ok: false, reason: "invalid" };
  }

  let tickets: RecoveryTicket[] = [head];
  const groupId = head.booking_details?.booking_group_id;
  if (isUuid(groupId)) {
    const { data: group } = await supabase
      .from("repair_tickets")
      .select(RECOVERY_COLUMNS)
      .eq("booking_details->>booking_group_id", groupId)
      .limit(10);
    const rows = ((group ?? []) as RecoveryTicket[]).filter((t) =>
      tokenMatches(token, t.booking_details?.recovery_token_hash),
    );
    if (rows.length > 0) tickets = rows;
  }

  if (tickets.some((t) => t.paid)) return { ok: false, reason: "paid" };
  if (tickets.some((t) => t.status !== "modtaget")) return { ok: false, reason: "closed" };

  const sessionId = tickets
    .map((t) => t.booking_details?.checkout_session_id)
    .find((s): s is string => typeof s === "string" && s.startsWith("cs_"));
  return {
    ok: true,
    tickets,
    alreadyInStore: tickets.every((t) => t.booking_details?.payment_flow === "butik"),
    sessionId: sessionId ?? null,
  };
}

/**
 * Gør sagerne til almindelig "betal i butikken"-booking: stempler booking_details,
 * skriver en linje i statuslog pr. sag. Opdateringen er betinget af paid = false og
 * status = modtaget, så en betaling der lander samtidig ikke overskrives.
 * Returnerer true, når mindst en sag blev ændret.
 */
export async function convertToPayInStore(supabase: SupabaseClient, tickets: RecoveryTicket[]): Promise<boolean> {
  const convertedAt = new Date().toISOString();
  const changed: string[] = [];
  for (const t of tickets) {
    const { data, error } = await supabase
      .from("repair_tickets")
      .update({
        booking_details: {
          ...(t.booking_details ?? {}),
          payment_flow: "butik",
          converted_from_online_at: convertedAt,
        },
      })
      .eq("id", t.id)
      .eq("paid", false)
      .eq("status", "modtaget")
      .select("id");
    if (error) throw new Error(`Kunne ikke opdatere sag ${t.id}: ${error.message}`);
    if (data && data.length > 0) changed.push(t.id);
  }
  if (changed.length === 0) return false;
  const { error: logError } = await supabase.from("repair_status_log").insert(
    changed.map((id) => ({
      ticket_id: id,
      old_status: "modtaget",
      new_status: "modtaget",
      note: PAY_IN_STORE_LOG_NOTE,
    })),
  );
  if (logError) console.error("[payment-recovery] status log failed:", logError);
  return true;
}
