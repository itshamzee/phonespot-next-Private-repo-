import { Resend } from "resend";
import type { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "./settings";
import { suggestForLead } from "./suggest";
import { explainPricing } from "./breakdown";
import { shouldAutoSend } from "./auto-send";
import { readLeadDevices, deviceLabel } from "./lead-devices";
import { logBuybackEvent } from "./events";
import { catalogLastSyncedAt, catalogStaleReason, pauseAutomation } from "./pause";
import { buildOfferEmailHtml, buildOfferEmailSubject } from "@/lib/email/offer-email";
import { buildDeclineEmailHtml, buildDeclineEmailSubject } from "@/lib/email/decline-email";
import { declineReason } from "./decline-reasons";
import { formatDKK } from "@/lib/supabase/trade-in-types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

export interface LeadInquiry {
  id: string;
  name: string;
  email: string;
  metadata: unknown;
}

/**
 * Prices a fresh buyback lead and, if it sits inside the safety envelope,
 * schedules the offer email with a hold window so admin can still take over.
 *
 * Never throws. A pricing problem must not cost us the customer's submission —
 * the lead is already saved by the time we get here.
 */
export async function dispatchAutoOffer(
  client: SupabaseAdmin,
  inquiry: LeadInquiry,
): Promise<void> {
  try {
    const settings = await loadBuybackSettings(client);

    // Stale parts prices mean quietly wrong deductions. Check before pricing, and
    // stop the automation rather than sending numbers nobody has checked.
    if (settings.autoSendEnabled && !settings.pausedReason) {
      const stale = catalogStaleReason(await catalogLastSyncedAt(client), new Date());
      if (stale) {
        await pauseAutomation(client, stale);
        settings.pausedReason = stale;
      }
    }

    const leadDevices = readLeadDevices(inquiry.metadata);
    const label = deviceLabel(leadDevices[0]?.device);
    const suggestion = await suggestForLead(client, inquiry.metadata, settings);

    // iCloud-locked is the one state that never depends on judgement: we can
    // neither wipe nor resell the device, so it is declined automatically.
    if (
      suggestion.suggestDecline &&
      settings.autoSendEnabled &&
      !settings.pausedReason &&
      leadDevices.length === 1
    ) {
      await autoDecline(client, inquiry, label, settings.fromAddress);
      return;
    }

    const decision = shouldAutoSend(suggestion, leadDevices.length, settings);

    if (!decision.send) {
      await logBuybackEvent(client, {
        type: "manual",
        severity: "info",
        summary: `${label} kræver manuel behandling: ${decision.reason}`,
        inquiryId: inquiry.id,
        detail: { reason: decision.reason },
      });
      return;
    }

    const amountOre = suggestion.totalAimOre;
    const sendAt = new Date(Date.now() + settings.holdMinutes * 60_000);

    const { data: offer, error } = await client
      .from("trade_in_offers")
      .insert({
        inquiry_id: inquiry.id,
        offer_amount: amountOre,
        auto_sent: true,
        send_state: "scheduled",
        scheduled_send_at: sendAt.toISOString(),
        pricing_breakdown: {
          explanation: suggestion.perDevice.map((d) => `${d.label}: ${explainPricing(d.result)}`),
          aimOfferOre: suggestion.totalAimOre,
          floorOfferOre: suggestion.totalFloorOre,
        },
        created_by: "System",
      })
      .select("id, token")
      .single();

    if (error || !offer) {
      await logBuybackEvent(client, {
        type: "error",
        severity: "critical",
        summary: `Kunne ikke oprette automatisk bud på ${label}`,
        inquiryId: inquiry.id,
        detail: { error: error?.message },
      });
      return;
    }

    const first = leadDevices[0]?.device;
    const condition = leadDevices[0]?.condition;
    const amountKr = formatDKK(amountOre);

    const html = buildOfferEmailHtml({
      customerName: inquiry.name,
      deviceType: first?.deviceType || "enhed",
      brand: first?.brand || "",
      model: first?.model || "",
      storage: first?.storage || null,
      conditionSummary:
        [
          condition?.screen ? `Skærm: ${condition.screen}` : null,
          condition?.back ? `Bagside: ${condition.back}` : null,
          condition?.battery ? `Batteri: ${condition.battery}` : null,
        ]
          .filter(Boolean)
          .join(", ") || "Ikke angivet",
      offerAmountKr: amountKr,
      acceptUrl: `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`,
      rejectUrl: `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`,
    });

    const subject = buildOfferEmailSubject(first?.model || "enhed", amountKr);

    // scheduledAt is what makes the hold window possible without a cron: the mail
    // sits in Resend until it fires, and can be cancelled or brought forward.
    const sent = await resend.emails.send({
      from: settings.fromAddress,
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
      scheduledAt: sendAt.toISOString(),
    });

    if (sent.error || !sent.data) {
      await client.from("trade_in_offers").update({ send_state: "failed" }).eq("id", offer.id);
      await logBuybackEvent(client, {
        type: "error",
        severity: "critical",
        summary: `Tilbudsmail på ${label} kunne ikke planlægges`,
        inquiryId: inquiry.id,
        offerId: offer.id,
        detail: { error: sent.error?.message },
      });
      return;
    }

    await client
      .from("trade_in_offers")
      .update({ resend_email_id: sent.data.id })
      .eq("id", offer.id);

    await client.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: "scheduled",
      resend_id: sent.data.id,
    });

    await logBuybackEvent(client, {
      type: "scheduled",
      severity: "info",
      summary: `${label}: bud på ${amountKr} sendes om ${settings.holdMinutes} min.`,
      inquiryId: inquiry.id,
      offerId: offer.id,
      detail: { amountOre, sendAt: sendAt.toISOString() },
    });
  } catch (err) {
    await logBuybackEvent(client, {
      type: "error",
      severity: "critical",
      summary: "Automatisk prissætning fejlede",
      inquiryId: inquiry.id,
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
  }
}

// Same shape as the manual decline in /api/trade-in/decline, done in-process so
// the dispatcher does not have to call its own API over the network.
async function autoDecline(
  client: SupabaseAdmin,
  inquiry: LeadInquiry,
  label: string,
  fromAddress: string,
): Promise<void> {
  const reason = declineReason("icloud_laast");
  const subject = buildDeclineEmailSubject(label);
  const html = buildDeclineEmailHtml({
    customerName: inquiry.name,
    deviceLabel: label,
    reasonCode: "icloud_laast",
  });

  let emailSent = false;
  try {
    const sent = await resend.emails.send({
      from: fromAddress,
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
    });
    emailSent = !sent.error;
    await client.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: emailSent ? "delivered" : "failed",
      resend_id: sent.data?.id ?? null,
    });
  } catch {
    await client.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: "failed",
    });
  }

  await client
    .from("buyback_declines")
    .insert({
      inquiry_id: inquiry.id,
      reason_code: "icloud_laast",
      email_sent: emailSent,
      declined_by: "system",
    });

  await client.from("contact_inquiries").update({ status: "lukket" }).eq("id", inquiry.id);

  await client.from("inquiry_messages").insert({
    inquiry_id: inquiry.id,
    sender: "staff",
    channel: "email",
    body: `Afvist automatisk: ${reason.label}`,
    staff_name: "System",
  });

  await logBuybackEvent(client, {
    type: "auto_declined",
    severity: emailSent ? "info" : "warn",
    summary: emailSent
      ? `${label} afvist automatisk (iCloud-låst)`
      : `${label} afvist automatisk (iCloud-låst) — mailen kunne ikke sendes`,
    inquiryId: inquiry.id,
  });
}
