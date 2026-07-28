import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type BuybackEventType =
  | "priced" // engine produced a result
  | "scheduled" // offer email queued with a hold window
  | "sent" // offer email left the building
  | "cancelled" // scheduled offer cancelled before sending
  | "taken_over" // admin took a lead out of automation
  | "manual" // lead fell outside the safety envelope
  | "auto_declined"
  | "declined"
  | "delivered" // Resend webhook
  | "bounced" // Resend webhook
  | "accepted" // customer accepted
  | "rejected" // customer rejected
  | "paused" // automation stopped itself
  | "resumed"
  | "error";

export type BuybackEventSeverity = "info" | "warn" | "critical";

export interface BuybackEventInput {
  type: BuybackEventType;
  summary: string; // Danish one-liner, reused verbatim in feed, SMS and digest
  severity?: BuybackEventSeverity;
  inquiryId?: string | null;
  offerId?: string | null;
  detail?: unknown;
}

// Writes one row to buyback_events. Logging must never break the operation it
// describes, so every failure is swallowed and reported to the server console.
export async function logBuybackEvent(
  client: SupabaseAdmin,
  event: BuybackEventInput,
): Promise<void> {
  try {
    await client.from("buyback_events").insert({
      inquiry_id: event.inquiryId ?? null,
      offer_id: event.offerId ?? null,
      type: event.type,
      severity: event.severity ?? "info",
      summary: event.summary,
      detail: event.detail ?? null,
    });
  } catch (err) {
    console.warn("[buyback] failed to log event", event.type, err);
  }
}
