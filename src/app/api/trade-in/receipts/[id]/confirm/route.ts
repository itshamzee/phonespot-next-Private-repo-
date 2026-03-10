import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/* POST /api/trade-in/receipts/[id]/confirm — confirm receipt + generate PDF */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch receipt with items
  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.status !== "draft") {
    return NextResponse.json({ error: "Receipt already confirmed" }, { status: 400 });
  }

  // Generate PDF via internal API
  const pdfRes = await fetch(`${BASE_URL}/api/trade-in/receipts/${id}/pdf`, {
    headers: { "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY || "" },
  });

  let pdfUrl: string | null = null;

  if (pdfRes.ok) {
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `${receipt.receipt_number}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("slutsedler")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from("slutsedler")
        .getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
    }

    // Send PDF to both parties
    const attachments = [{ filename: `Slutseddel-${receipt.receipt_number}.pdf`, content: pdfBuffer }];

    if (receipt.seller_email) {
      try {
        await resend.emails.send({
          from: "PhoneSpot <noreply@phonespot.dk>",
          to: receipt.seller_email,
          subject: `Slutseddel ${receipt.receipt_number} — PhoneSpot`,
          html: `<p>Hej ${receipt.seller_name},</p><p>Vedhæftet finder du din slutseddel.</p><p>Med venlig hilsen,<br>PhoneSpot</p>`,
          attachments,
        });
      } catch { /* non-fatal */ }
    }

    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Slutseddel bekræftet: ${receipt.receipt_number}`,
        html: `<p>Slutseddel ${receipt.receipt_number} er bekræftet for ${receipt.seller_name}.</p>`,
        attachments,
      });
    } catch { /* non-fatal */ }
  }

  // Update receipt status
  const { data: updated, error } = await supabase
    .from("trade_in_receipts")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      pdf_url: pdfUrl,
    })
    .eq("id", id)
    .select("*, trade_in_receipt_items(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
