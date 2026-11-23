import { NextResponse, after } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { rpcConflict } from "@/lib/opkoeb/rpc-conflict";
import { attestationFor, loadReceiptForActor, receiptForRules } from "@/lib/opkoeb/receipt-access";
import { confirmBlockers } from "@/lib/opkoeb/rules";
import { PosError } from "@/lib/pos/errors";
import { copenhagenDateString } from "@/lib/pos/copenhagen";
import { loadSlutseddelData } from "@/lib/opkoeb/slutseddel-data";
import { renderSlutseddelPdf } from "@/lib/pdf/slutseddel";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

const BUCKET = "slutsedler";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * POST /api/trade-in/receipts/[id]/confirm: bekræfter kladden via trade_in_confirm
 * (nummer, enheder, indkøbsbilag), gemmer PDF'en privat og mailer den til sælger.
 * Sedlen er bekræftet, så snart RPC'en er gået igennem; PDF og mail er bagefter
 * og vælter aldrig svaret (PDF'en kan altid renderes igen fra pdf-ruten).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    const supabase = createServerClient();
    // Samme regler som editoren viser, med dagens dato i Danmark. RPC'en er
    // stadig den endelige myndighed; en låst seddel afvises dér.
    if (row.status === "draft") {
      const { data: items, error: itemsErr } = await supabase
        .from("trade_in_receipt_items")
        .select("template_id, imei_serial, price, created_at")
        .eq("receipt_id", id)
        .order("created_at", { ascending: true });
      if (itemsErr) throw new Error(`Failed to load receipt items: ${itemsErr.message}`);
      const blockers = confirmBlockers(
        receiptForRules(row, (items ?? []) as Array<Record<string, unknown>>),
        copenhagenDateString(),
      );
      if (blockers.length > 0) throw new PosError("confirm_blocked", blockers[0], 409);

      // Online-accept skal stadig holde (tilbud, ét brug, beløb); ellers kræves papir.
      // Totalen tages fra varerne: PATCH skriver total og varer i to trin.
      if (row.attestation === "online_accept") {
        const itemSum = (items ?? []).reduce((s, i) => s + (typeof i.price === "number" ? i.price : 0), 0);
        const now = await attestationFor({
          offerId: row.offer_id,
          inquiryId: row.inquiry_id,
          receiptId: id,
          totalOere: itemSum,
        });
        if (now !== "online_accept") {
          const { error: attErr } = await supabase.from("trade_in_receipts").update({ attestation: now }).eq("id", id);
          if (attErr) throw new Error(`Failed to reset attestation: ${attErr.message}`);
        }
      }
    }

    const { data: rpc, error: rpcErr } = await supabase.rpc("trade_in_confirm", {
      p_receipt_id: id,
      p_staff_id: actor.id,
    });
    if (rpcErr) {
      const conflict = rpcConflict(rpcErr);
      if (conflict) throw conflict;
      throw new Error(`trade_in_confirm: ${rpcErr.message}`);
    }
    const result = rpc as { receipt_number?: string; device_ids?: string[] } | null;
    const receiptNumber = result?.receipt_number;
    if (!receiptNumber) throw new Error("trade_in_confirm returned no receipt_number");

    try {
      const { data, sellerEmail } = await loadSlutseddelData(id);
      const pdf = await renderSlutseddelPdf(data);
      // Stien bygges kun af nummeret fra RPC'en.
      const path = `slutsedler/${receiptNumber}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(`${receiptNumber}.pdf`, pdf, { contentType: "application/pdf", upsert: true });
      if (uploadErr) {
        console.error("[opkoeb] slutseddel upload failed", receiptNumber, uploadErr.message);
      } else {
        // trade_in_receipts.pdf_url er låst efter bekræftelsen, så kun bilagene får stien.
        const { error: docErr } = await supabase
          .from("purchase_documents")
          .update({ pdf_url: path })
          .eq("trade_in_receipt_id", id);
        if (docErr) console.error("[opkoeb] purchase_documents.pdf_url failed", receiptNumber, docErr.message);
      }

      if (sellerEmail) {
        after(async () => {
          try {
            await resend.emails.send({
              from: EMAIL_FROM,
              to: sellerEmail,
              subject: `Slutseddel ${receiptNumber}`,
              html: `<p>Hej ${esc(data.seller_name)},</p><p>Vedhæftet finder du din slutseddel.</p><p>Med venlig hilsen<br>PhoneSpot</p>`,
              attachments: [{ filename: `Slutseddel-${receiptNumber}.pdf`, content: pdf }],
            });
          } catch (err) {
            console.error("[opkoeb] slutseddel mail failed", receiptNumber, err);
          }
        });
      }
    } catch (err) {
      console.error("[opkoeb] slutseddel pdf/upload failed", receiptNumber, err);
    }

    return NextResponse.json({ receipt_number: receiptNumber, device_ids: result?.device_ids ?? [] });
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke bekræfte slutsedlen");
  }
}
