import { Resend } from "resend";
import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/gateway-api/client";
import { customerLabelUrl } from "@/lib/shipmondo/buyback-label";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { buildFollowupMessage, wholeKr } from "@/lib/email/buyback-followup-email";
import { logBuybackEvent } from "./events";
import { readLeadDevices, deviceLabel } from "./lead-devices";
import { loadBuybackSettings } from "./settings";
import {
  decideFollowup,
  formatDanishDay,
  insideSendWindow,
  type FollowupKind,
} from "./followup";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

// The automatic acceptance writes this as a "customer" message. It is not the
// customer talking to us, so it must not stop the reminders.
const AUTOMATIC_CUSTOMER_BODIES = new Set(["Tilbud accepteret", "Tilbud afvist"]);

interface OfferRow {
  id: string;
  inquiry_id: string;
  status: string;
  offer_amount: number;
  token: string;
  token_expires_at: string | null;
  responded_at: string | null;
  received_at: string | null;
  created_at: string;
  scheduled_send_at: string | null;
  send_state: string | null;
  seller_name: string | null;
}

interface InquiryRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  metadata: unknown;
  store_id: string | null;
}

export interface FollowupTarget {
  offer: OfferRow;
  inquiry: InquiryRow;
}

export interface RunResult {
  checked: number;
  sent: { offerId: string; kind: FollowupKind; channels: string[] }[];
  expiredQuietly: number;
  skippedOutsideWindow: boolean;
  errors: string[];
}

/**
 * The hourly follow-up pass. Expiry happens at any hour; anything that contacts
 * a customer only happens 9–20 Danish time.
 */
export async function runBuybackFollowups(
  client: SupabaseAdmin,
  opts: { now?: Date; dryRun?: boolean } = {},
): Promise<RunResult> {
  const now = opts.now ?? new Date();
  const canContact = insideSendWindow(now);
  const result: RunResult = {
    checked: 0,
    sent: [],
    expiredQuietly: 0,
    skippedOutsideWindow: !canContact,
    errors: [],
  };

  // Pending offers of any age (old ones must be closed), and acceptances from the
  // last 30 days that have not arrived.
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [{ data: pending, error: e1 }, { data: accepted, error: e2 }] = await Promise.all([
    client.from("trade_in_offers").select(OFFER_COLUMNS).eq("status", "pending"),
    client
      .from("trade_in_offers")
      .select(OFFER_COLUMNS)
      .eq("status", "accepted")
      .is("received_at", null)
      .gte("responded_at", since),
  ]);
  if (e1 || e2) {
    result.errors.push((e1 ?? e2)!.message);
    return result;
  }

  const offers = ([...(pending ?? []), ...(accepted ?? [])] as OfferRow[]).filter(
    // Not yet out of the door, or never made it: nothing to follow up.
    (o) => !["scheduled", "cancelled", "failed"].includes(o.send_state ?? ""),
  );
  result.checked = offers.length;
  if (offers.length === 0) return result;

  const offerIds = offers.map((o) => o.id);
  const inquiryIds = [...new Set(offers.map((o) => o.inquiry_id))];

  const [inquiries, followups, labels, messages, newest] = await Promise.all([
    client.from("contact_inquiries").select("id, name, email, phone, metadata, store_id").in("id", inquiryIds),
    client.from("buyback_followups").select("offer_id, kind").in("offer_id", offerIds),
    client.from("shipping_labels").select("offer_id, status").in("offer_id", offerIds),
    client
      .from("inquiry_messages")
      .select("inquiry_id, sender, body, created_at")
      .in("inquiry_id", inquiryIds)
      .eq("sender", "customer"),
    client.from("trade_in_offers").select("id, inquiry_id, created_at").in("inquiry_id", inquiryIds),
  ]);

  const inquiryById = new Map((inquiries.data ?? []).map((i) => [i.id as string, i as InquiryRow]));
  const sentByOffer = new Map<string, Set<FollowupKind>>();
  for (const f of followups.data ?? []) {
    const set = sentByOffer.get(f.offer_id) ?? new Set<FollowupKind>();
    if (f.kind !== "manual") set.add(f.kind as FollowupKind);
    sentByOffer.set(f.offer_id, set);
  }
  const moving = new Set(
    (labels.data ?? [])
      .filter((l) => l.status === "in_transit" || l.status === "delivered")
      .map((l) => l.offer_id as string),
  );
  const latestOfferForInquiry = new Map<string, { id: string; at: number }>();
  for (const o of newest.data ?? []) {
    const at = new Date(o.created_at).getTime();
    const cur = latestOfferForInquiry.get(o.inquiry_id);
    if (!cur || at > cur.at) latestOfferForInquiry.set(o.inquiry_id, { id: o.id, at });
  }

  for (const offer of offers) {
    const inquiry = inquiryById.get(offer.inquiry_id);
    if (!inquiry) continue;

    const sentAt = new Date(offer.scheduled_send_at ?? offer.created_at);
    const replyCutoff = new Date(offer.status === "accepted" ? offer.responded_at! : sentAt).getTime();
    const replied = (messages.data ?? []).some(
      (m) =>
        m.inquiry_id === offer.inquiry_id &&
        !AUTOMATIC_CUSTOMER_BODIES.has((m.body ?? "").trim()) &&
        new Date(m.created_at).getTime() > replyCutoff,
    );

    const decision = decideFollowup(
      {
        status: offer.status,
        createdAt: sentAt,
        tokenExpiresAt: offer.token_expires_at ? new Date(offer.token_expires_at) : null,
        respondedAt: offer.responded_at ? new Date(offer.responded_at) : null,
        receivedAt: offer.received_at ? new Date(offer.received_at) : null,
        parcelMoving: moving.has(offer.id),
        customerRepliedAfterOffer: replied,
        alreadySent: sentByOffer.get(offer.id) ?? new Set(),
      },
      now,
    );
    if (!decision) continue;

    // "Har du sendt den?" is only fair when we can see the parcel. Until carrier
    // tracking reaches shipping_labels (it never has: every buyback label is
    // still label_created, including parcels that arrived), customers who did
    // send would be asked whether they had. Off until BUYBACK_SHIP_REMINDERS=1.
    if (
      (decision.kind === "ship_3d" || decision.kind === "ship_7d") &&
      process.env.BUYBACK_SHIP_REMINDERS !== "1"
    ) {
      continue;
    }

    // A newer offer on the same case replaced this one: close it, never mail it.
    const superseded = latestOfferForInquiry.get(offer.inquiry_id)?.id !== offer.id;
    const contact = decision.contact && !superseded;

    if (opts.dryRun) {
      result.sent.push({ offerId: offer.id, kind: decision.kind, channels: contact ? ["dry-run"] : [] });
      continue;
    }

    // At night, a step that contacts the customer waits whole — including the
    // status change, because an offer marked expired drops out of the pending
    // query and its "vil du have et nyt bud?" mail would never go.
    if (contact && !canContact) continue;

    if (decision.markExpired) {
      await client
        .from("trade_in_offers")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("id", offer.id)
        .eq("status", "pending");
    }

    if (!contact) {
      await claim(client, offer, decision.kind, "none");
      if (decision.markExpired) result.expiredQuietly++;
      continue;
    }

    try {
      const channels = await sendFollowup(client, { offer, inquiry }, decision.kind, "System");
      if (channels.length) result.sent.push({ offerId: offer.id, kind: decision.kind, channels });
    } catch (err) {
      result.errors.push(`${offer.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

const OFFER_COLUMNS =
  "id, inquiry_id, status, offer_amount, token, token_expires_at, responded_at, received_at, created_at, scheduled_send_at, send_state, seller_name";

/** Inserts the once-only row. false = another run already did this step. */
async function claim(
  client: SupabaseAdmin,
  offer: OfferRow,
  kind: FollowupKind | "manual",
  channel: "email" | "sms" | "none",
  sentBy = "System",
): Promise<string | null> {
  const { data, error } = await client
    .from("buyback_followups")
    .insert({ offer_id: offer.id, inquiry_id: offer.inquiry_id, kind, channel, sent_by: sentBy })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return data.id as string;
}

/**
 * Sends one follow-up by mail, and by SMS where the customer asked for SMS or
 * where the money is already agreed (accepted, not sent). Used by the cron and
 * by the admin "send påmindelse" button (kind = the step the offer is at).
 */
export async function sendFollowup(
  client: SupabaseAdmin,
  target: FollowupTarget,
  kind: FollowupKind,
  sentBy: string,
  opts: { manual?: boolean } = {},
): Promise<string[]> {
  const { offer, inquiry } = target;
  const meta = (inquiry.metadata ?? {}) as Record<string, unknown>;
  const devices = readLeadDevices(inquiry.metadata);
  const label =
    devices.length > 1 ? `dine ${devices.length} enheder` : `din ${stripBrand(deviceLabel(devices[0]?.device))}`;
  const inStore = meta.deliveryMethod === "Aflever i butik";
  const store = inStore
    ? storeLabel(normalizeStoreId(meta.preferredStore) ?? normalizeStoreId(inquiry.store_id))
    : null;
  const expires = offer.token_expires_at ? new Date(offer.token_expires_at) : new Date();

  const message = buildFollowupMessage({
    kind,
    firstName: firstName(offer.seller_name || inquiry.name),
    deviceLabel: label,
    amountKr: wholeKr(offer.offer_amount),
    expiresDay: formatDanishDay(expires),
    acceptUrl: `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`,
    rejectUrl: `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`,
    labelUrl: inStore ? null : customerLabelUrl(offer.token),
    storeName: store && store !== "Generel" ? store : null,
  });

  const stepKind = opts.manual ? "manual" : kind;
  const channels: string[] = [];
  const settings = await loadBuybackSettings(client);

  if (inquiry.email) {
    const claimId = await claim(client, offer, stepKind, "email", sentBy);
    if (claimId) {
      const sent = await resend.emails.send({
        from: settings.fromAddress,
        to: inquiry.email,
        replyTo: "info@phonespot.dk",
        subject: message.subject,
        html: message.html,
      });
      const ok = !sent.error && Boolean(sent.data);
      await client
        .from("buyback_followups")
        .update({ ok, error: sent.error?.message ?? null })
        .eq("id", claimId);
      if (ok) {
        channels.push("email");
        await client.from("mail_log").insert({
          inquiry_id: inquiry.id,
          to_email: inquiry.email,
          subject: message.subject,
          body: message.html,
          status: "sent",
          resend_id: sent.data!.id,
        });
      }
    }
  }

  const wantsSms =
    meta.preferredContact === "SMS" || kind === "ship_3d" || kind === "ship_7d" || !inquiry.email;
  if (inquiry.phone && wantsSms) {
    const claimId = await claim(client, offer, stepKind, "sms", sentBy);
    if (claimId) {
      const sms = await sendSms(inquiry.phone, message.sms);
      await client
        .from("buyback_followups")
        .update({ ok: sms.success, error: sms.error })
        .eq("id", claimId);
      await client.from("sms_log").insert({
        phone: inquiry.phone,
        message: message.sms,
        provider_message_id: sms.messageId,
        status: sms.success ? "sent" : "failed",
      });
      if (sms.success) channels.push("sms");
    }
  }

  await logBuybackEvent(client, {
    type: channels.length ? "sent" : "error",
    severity: channels.length ? "info" : "warn",
    summary: channels.length
      ? `${KIND_LABEL[kind]} sendt (${channels.join(" + ")}): ${label}, ${wholeKr(offer.offer_amount)}`
      : `${KIND_LABEL[kind]} kunne ikke sendes: ${label}`,
    inquiryId: inquiry.id,
    offerId: offer.id,
    detail: { kind, channels, sentBy },
  });

  return channels;
}

export const KIND_LABEL: Record<FollowupKind, string> = {
  reminder_24h: "Påmindelse 1",
  reminder_72h: "Påmindelse 2",
  expired: "Udløbet – tilbud om nyt bud",
  ship_3d: "Har du sendt den? (3 dage)",
  ship_7d: "Vi venter stadig (7 dage)",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "der";
}

// "Apple iPhone 14 Pro 128GB" reads stiffly in a sentence; the model is enough.
function stripBrand(label: string): string {
  return label.replace(/^Apple\s+/i, "");
}
