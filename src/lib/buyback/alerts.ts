import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/gateway-api";
import { loadBuybackSettings } from "./settings";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// One errand per SMS: what happened, and where to look. Never throws — an alert
// that fails must not take down the thing it was warning about.
export async function sendCriticalAlert(client: SupabaseAdmin, message: string): Promise<void> {
  try {
    const settings = await loadBuybackSettings(client);
    if (!settings.smsRecipient) return; // nobody to tell yet

    await sendSms({
      to: settings.smsRecipient,
      message: `PhoneSpot opkøb: ${message}. Se /admin/opkoeb`,
    });
  } catch (err) {
    console.warn("[buyback] failed to send critical alert", err);
  }
}
