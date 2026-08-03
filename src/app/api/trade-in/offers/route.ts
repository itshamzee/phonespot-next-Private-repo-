import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";
import {
  buildOfferEmailHtml,
  buildOfferEmailSubject,
  buildMultiDeviceOfferEmailSubject,
  type OfferEmailLines,
} from "@/lib/email/offer-email";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { readLeadDevices } from "@/lib/buyback/lead-devices";
import {
  buildOfferLines,
  singleLine,
  includedLines,
  excludedLines,
  type OfferLine,
} from "@/lib/buyback/offer-lines";
import { declineReason } from "@/lib/buyback/decline-reasons";
import { requireStaff } from "@/lib/auth/require-staff";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/* GET /api/trade-in/offers?inquiry_id=xxx */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* POST /api/trade-in/offers — create offer and send email */
export async function POST(req: Request) {
  // Staff only. This route acts on a customer's behalf — it was reachable by
  // anyone who could guess an id.
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { inquiry_id, offer_amount, admin_note, created_by, lines } = body;

  if (!inquiry_id || (!offer_amount && !lines)) {
    return NextResponse.json({ error: "inquiry_id and offer_amount required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Fetch the inquiry first: the devices are needed to validate the lines,
  //    and a rejected offer must not have expired the previous one on its way
  //    out. Nothing is written until everything checks out.
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", inquiry_id)
    .single();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const leadDevices = readLeadDevices(inquiry.metadata);

  // 2. Resolve the amount. With lines, the total is ours to compute — an amount
  //    from the client could contradict the lines the customer is reading.
  let offerLines: OfferLine[] | null = null;
  let amountOre: number;

  if (lines) {
    const built = buildOfferLines(leadDevices, lines);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }
    offerLines = built.lines;
    amountOre = built.totalOre;
  } else {
    amountOre = offer_amount;
    offerLines = singleLine(leadDevices, amountOre);
  }

  // 3. Expire any existing pending offers for this inquiry
  await supabase
    .from("trade_in_offers")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("inquiry_id", inquiry_id)
    .eq("status", "pending");

  // 4. Create new offer
  const { data: offer, error: offerErr } = await supabase
    .from("trade_in_offers")
    .insert({
      inquiry_id,
      offer_amount: amountOre,
      offer_lines: offerLines,
      admin_note: admin_note || null,
      created_by: created_by || null,
    })
    .select()
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: offerErr?.message || "Failed to create offer" }, { status: 500 });
  }

  // 5. Build email
  const device = leadDevices[0]?.device;
  const condition = leadDevices[0]?.condition;
  const amountKr = formatDKK(amountOre);

  const emailLines: OfferEmailLines | null = offerLines
    ? {
        included: includedLines(offerLines).map((line) => ({
          label: line.label,
          amountKr: formatDKK(line.amount_ore),
        })),
        excluded: excludedLines(offerLines).map((line) => ({
          label: line.label,
          reasonBody: line.reason_code ? declineReason(line.reason_code).body : "",
        })),
      }
    : null;

  const conditionParts = [
    condition?.screen ? `Skærm: ${condition.screen}` : null,
    condition?.back ? `Bagside: ${condition.back}` : null,
    condition?.battery ? `Batteri: ${condition.battery}` : null,
  ].filter(Boolean).join(", ");

  const acceptUrl = `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`;
  const rejectUrl = `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`;

  const emailHtml = buildOfferEmailHtml({
    customerName: inquiry.name,
    deviceType: device?.deviceType || "enhed",
    brand: device?.brand || "",
    model: device?.model || "",
    storage: device?.storage || null,
    conditionSummary: conditionParts || "Ikke angivet",
    offerAmountKr: amountKr,
    acceptUrl,
    rejectUrl,
    lines: emailLines,
  });

  // The line table carries the device names when there are several; the subject
  // counts them instead of naming the first one.
  const subject =
    emailLines && emailLines.included.length + emailLines.excluded.length > 1
      ? buildMultiDeviceOfferEmailSubject(
          emailLines.included.length + emailLines.excluded.length,
          amountKr,
        )
      : buildOfferEmailSubject(device?.model || "enhed", amountKr);

  // 5. Send email via Resend
  try {
    const emailResult = await resend.emails.send({
      from: "PhoneSpot <info@phonespot.dk>",
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html: emailHtml,
    });

    // Log to mail_log
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "delivered",
      resend_id: emailResult.data?.id || null,
    });
  } catch (emailErr) {
    // Log failure but don't fail the offer creation
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "failed",
    });
  }

  // 6. Update inquiry status
  await supabase
    .from("contact_inquiries")
    .update({ status: "besvaret" })
    .eq("id", inquiry_id);

  // 7. Log as inquiry message
  await supabase.from("inquiry_messages").insert({
    inquiry_id,
    sender: "staff",
    channel: "email",
    body: [
      `Tilbud sendt: ${amountKr}`,
      // The split belongs in the lead history too — otherwise a colleague
      // reading it later cannot see why one device is missing from the total.
      ...(offerLines && offerLines.length > 1
        ? offerLines.map((line) =>
            line.excluded
              ? `  ${line.label}: ikke med (${line.reason_code ? declineReason(line.reason_code).label : "ukendt årsag"})`
              : `  ${line.label}: ${formatDKK(line.amount_ore)}`,
          )
        : []),
      admin_note ? `(note: ${admin_note})` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    staff_name: created_by || "System",
  });

  return NextResponse.json(offer, { status: 201 });
}
