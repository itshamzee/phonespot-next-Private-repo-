import type { createAdminClient } from "@/lib/supabase/admin";
import type { DigestData } from "@/lib/email/buyback-digest";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";
import { readLeadDevices, deviceLabel } from "./lead-devices";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function daysSince(iso: string | null, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

// Gathers the day's work list. Everything here is derived from data that already
// exists — the digest reports the state of the business, it does not invent one.
export async function collectDigestData(client: SupabaseAdmin): Promise<DigestData> {
  const now = Date.now();
  const since = new Date(now - 86_400_000).toISOString();

  /* --- Money out: confirmed receipts waiting to be paid --- */
  const { data: receipts } = await client
    .from("trade_in_receipts")
    .select("receipt_number, seller_name, seller_bank_reg, seller_bank_account, total_amount, status, inquiry_id")
    .eq("status", "confirmed");

  const toPay = ((receipts ?? []) as {
    receipt_number: string;
    seller_name: string;
    seller_bank_reg: string | null;
    seller_bank_account: string | null;
    total_amount: number;
  }[]).map((r) => ({
    sellerName: r.seller_name,
    bankReg: r.seller_bank_reg ?? "",
    bankAccount: r.seller_bank_account ?? "",
    amountKr: Math.round(r.total_amount / 100),
    receiptNumber: r.receipt_number,
  }));

  /* --- Devices on their way in: accepted offers with no receipt yet --- */
  const { data: acceptedOffers } = await client
    .from("trade_in_offers")
    .select("id, inquiry_id, responded_at, created_at")
    .eq("status", "accepted");

  const acceptedList = (acceptedOffers ?? []) as {
    id: string;
    inquiry_id: string;
    responded_at: string | null;
    created_at: string;
  }[];

  const { data: allReceiptRows } = await client
    .from("trade_in_receipts")
    .select("inquiry_id");
  const receiptInquiryIds = new Set(
    ((allReceiptRows ?? []) as { inquiry_id: string | null }[]).map((r) => r.inquiry_id),
  );

  const pendingArrival = acceptedList.filter((o) => !receiptInquiryIds.has(o.inquiry_id));

  const { data: arrivalInquiries } = pendingArrival.length
    ? await client
        .from("contact_inquiries")
        .select("id, name, metadata")
        .in("id", pendingArrival.map((o) => o.inquiry_id))
    : { data: [] };

  const arrivalById = new Map(
    ((arrivalInquiries ?? []) as { id: string; name: string; metadata: unknown }[]).map((i) => [
      i.id,
      i,
    ]),
  );

  // Carrier progress, so "undervejs" reflects the parcel rather than the number
  // of days since the customer clicked accept.
  const { data: labelRows } = pendingArrival.length
    ? await client
        .from("shipping_labels")
        .select("offer_id, tracking_number, in_transit_at, delivered_at, last_event_at, created_at")
        .in("offer_id", pendingArrival.map((o) => o.id))
    : { data: [] };

  const labelByOffer = new Map(
    ((labelRows ?? []) as {
      offer_id: string;
      tracking_number: string | null;
      in_transit_at: string | null;
      delivered_at: string | null;
      last_event_at: string | null;
      created_at: string;
    }[]).map((l) => [l.offer_id, l]),
  );

  const toReceive = pendingArrival.map((offer) => {
    const inquiry = arrivalById.get(offer.inquiry_id);
    const label = labelByOffer.get(offer.id);
    return {
      customerName: inquiry?.name ?? "Ukendt kunde",
      deviceLabel: deviceLabel(readLeadDevices(inquiry?.metadata)[0]?.device),
      daysInTransit: daysSince(
        label?.in_transit_at ?? offer.responded_at ?? offer.created_at,
        now,
      ),
    };
  });

  /* --- Parcels nobody can account for --- */
  const STUCK_DELIVERED_DAYS = 2;
  const STUCK_SILENT_DAYS = 3;

  const stuck: DigestData["stuck"] = [];
  for (const offer of pendingArrival) {
    const label = labelByOffer.get(offer.id);
    if (!label) continue;

    const inquiry = arrivalById.get(offer.inquiry_id);
    const base = {
      deviceLabel: deviceLabel(readLeadDevices(inquiry?.metadata)[0]?.device),
      customerName: inquiry?.name ?? "Ukendt kunde",
      trackingNumber: label.tracking_number,
    };

    if (label.delivered_at) {
      // The offer has no receipt yet, so nobody has marked it received.
      const days = daysSince(label.delivered_at, now);
      if (days >= STUCK_DELIVERED_DAYS) {
        stuck.push({ ...base, days, reason: "leveret_ikke_modtaget" });
      }
      continue;
    }

    // Shipment Monitor has no REST endpoint, so a lost webhook cannot be
    // re-fetched. Silence is reported rather than repaired.
    const days = daysSince(label.last_event_at ?? label.created_at, now);
    if (days >= STUCK_SILENT_DAYS) {
      stuck.push({ ...base, days, reason: "ingen_bevaegelse" });
    }
  }

  stuck.sort((a, b) => b.days - a.days);

  /* --- The manual queue --- */
  const { data: leads } = await client
    .from("contact_inquiries")
    .select("id, status, created_at, metadata")
    .eq("source", "saelg-enhed");

  const leadRows = (leads ?? []) as {
    id: string;
    status: string;
    created_at: string;
    metadata: unknown;
  }[];

  const leadIds = leadRows.map((l) => l.id);
  const [{ data: offersForLeads }, { data: receiptsForLeads }, { data: declinesForLeads }] =
    leadIds.length
      ? await Promise.all([
          client.from("trade_in_offers").select("inquiry_id, status").in("inquiry_id", leadIds),
          client.from("trade_in_receipts").select("inquiry_id, status").in("inquiry_id", leadIds),
          client.from("buyback_declines").select("id, inquiry_id").in("inquiry_id", leadIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const waitingLeads = leadRows.filter((lead) => {
    const status = deriveTradeInStatus(
      lead.status,
      ((offersForLeads ?? []) as { inquiry_id: string; status: string }[]).filter(
        (o) => o.inquiry_id === lead.id,
      ) as never,
      ((receiptsForLeads ?? []) as { inquiry_id: string; status: string }[]).filter(
        (r) => r.inquiry_id === lead.id,
      ) as never,
      ((declinesForLeads ?? []) as { id: string; inquiry_id: string }[]).filter(
        (d) => d.inquiry_id === lead.id,
      ),
    );
    return status === "ny";
  });

  // The reason each one is still here comes from the event the dispatcher wrote.
  const { data: manualEvents } = waitingLeads.length
    ? await client
        .from("buyback_events")
        .select("inquiry_id, summary, created_at")
        .eq("type", "manual")
        .in("inquiry_id", waitingLeads.map((l) => l.id))
        .order("created_at", { ascending: false })
    : { data: [] };

  const reasonByInquiry = new Map<string, string>();
  for (const ev of (manualEvents ?? []) as { inquiry_id: string; summary: string }[]) {
    if (!reasonByInquiry.has(ev.inquiry_id)) reasonByInquiry.set(ev.inquiry_id, ev.summary);
  }

  const oldestDays = waitingLeads.reduce(
    (max, lead) => Math.max(max, daysSince(lead.created_at, now)),
    0,
  );

  const biggest = waitingLeads.slice(0, 3).map((lead) => ({
    label: deviceLabel(readLeadDevices(lead.metadata)[0]?.device),
    reason: reasonByInquiry.get(lead.id) ?? "Afventer behandling",
  }));

  /* --- Yesterday, and anything that went wrong --- */
  const { data: events } = await client
    .from("buyback_events")
    .select("type, severity, summary, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const eventRows = (events ?? []) as { type: string; severity: string; summary: string }[];
  const sent = eventRows.filter((e) => e.type === "sent" || e.type === "scheduled").length;
  const accepted = eventRows.filter((e) => e.type === "accepted").length;
  const rejected = eventRows.filter((e) => e.type === "rejected").length;
  const answered = accepted + rejected;

  return {
    toPay,
    toReceive,
    stuck,
    waiting: { total: waitingLeads.length, oldestDays, biggest },
    yesterday: {
      sent,
      accepted,
      rejected,
      acceptRatePct: answered > 0 ? Math.round((accepted / answered) * 100) : null,
    },
    problems: eventRows
      .filter((e) => e.severity !== "info")
      .map((e) => ({ summary: e.summary, severity: e.severity })),
  };
}
