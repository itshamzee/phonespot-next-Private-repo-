import type { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "@/lib/buyback/events";
import { parseManualStatus } from "@/lib/supabase/trade-in-types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/**
 * An accepted offer is the newest decision on a case, so any manual status set
 * before it must stop overriding the real status. Without this, a case that a
 * bulk edit had parked as "modtaget" (or "afvist") vanished from the overview
 * the moment the customer accepted.
 *
 * Logs the previous value in buyback_events. Never throws: the acceptance has
 * already been saved and must not fail because of bookkeeping.
 */
export async function clearManualStatusOnAccept(
  supabase: SupabaseAdmin,
  inquiryId: string,
  offerId: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from("contact_inquiries")
      .select("manual_status")
      .eq("id", inquiryId)
      .maybeSingle();

    const previous = parseManualStatus((data as { manual_status?: unknown } | null)?.manual_status);
    if (!previous) return;

    const { error } = await supabase
      .from("contact_inquiries")
      .update({ manual_status: null })
      .eq("id", inquiryId);
    if (error) throw error;

    await logBuybackEvent(supabase, {
      type: "manual",
      severity: "info",
      summary: `Manuel status "${previous}" fjernet, fordi tilbuddet blev accepteret`,
      inquiryId,
      offerId,
      detail: { previousManualStatus: previous },
    });
  } catch (err) {
    console.warn("[buyback] could not clear manual_status on accept", err);
  }
}
