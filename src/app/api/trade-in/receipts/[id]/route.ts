import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { receiptDraftSchema } from "@/lib/opkoeb/schemas";
import {
  attestationFor,
  checkStamps,
  offerUsedConflict,
  touchedChecks,
  draftColumns,
  itemRows,
  itemsTotal,
  loadReceiptForActor,
  sanitizeReceipt,
  type ReceiptRow,
} from "@/lib/opkoeb/receipt-access";

type Ctx = { params: Promise<{ id: string }> };

const LOCKED = () => NextResponse.json({ error: "Slutsedlen er bekræftet og kan ikke rettes" }, { status: 409 });

async function loadWithItems(id: string): Promise<ReceiptRow> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to load receipt");
  return data as ReceiptRow;
}

/* GET /api/trade-in/receipts/[id] — én seddel med varer; ID-nummer og kontonummer maskeres, når den er låst */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { id } = await params;
    await loadReceiptForActor(staff.actor, id);
    return NextResponse.json(sanitizeReceipt(await loadWithItems(id), { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke hente slutsedlen");
  }
}

/* PATCH /api/trade-in/receipts/[id] — ret en kladde. Sendes items, erstattes varerne helt. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const existing = await loadReceiptForActor(actor, id);
    if (existing.status !== "draft") return LOCKED();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
    }
    const parsed = receiptDraftSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || "Ugyldig forespørgsel", path: issue?.path.join(".") },
        { status: 400 },
      );
    }
    const { items, ...draft } = parsed.data;

    const fields = draftColumns(draft);
    const total = items ? itemsTotal(items) : (existing.total_amount as number | null) ?? 0;
    // Kun når tilbud, henvendelse eller total ændres; et almindeligt autogem rører den ikke.
    const relinked = ["offer_id", "inquiry_id"].some((k) => k in fields && (fields[k] ?? null) !== (existing[k] ?? null));
    if (relinked || total !== existing.total_amount) {
      const linked = { ...existing, ...fields };
      fields.attestation = await attestationFor({
        offerId: linked.offer_id,
        inquiryId: linked.inquiry_id,
        receiptId: id,
        totalOere: total,
      });
    }
    const merged = { ...existing, ...fields };
    const update: Record<string, unknown> = {
      ...fields,
      ...checkStamps(merged, existing, actor.id, new Date().toISOString(), touchedChecks(fields, existing)),
    };
    if (items) update.total_amount = total;

    const supabase = createServerClient();
    if (Object.keys(update).length > 0) {
      const { data: updated, error } = await supabase
        .from("trade_in_receipts")
        .update(update)
        .eq("id", id)
        .eq("status", "draft")
        .select("id");
      if (error) throw offerUsedConflict(error) ?? new Error(error.message);
      // Bekræftet imellem tjekket og skrivningen: rør ikke varerne.
      if (!updated || updated.length === 0) return LOCKED();
    }

    if (items) {
      const { error: delErr } = await supabase.from("trade_in_receipt_items").delete().eq("receipt_id", id);
      if (delErr) throw new Error(delErr.message);
      if (items.length > 0) {
        const { error: insErr } = await supabase.from("trade_in_receipt_items").insert(itemRows(id, items));
        if (insErr) throw new Error(insErr.message);
      }
    }

    return NextResponse.json(sanitizeReceipt(await loadWithItems(id), { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke rette kladden");
  }
}

/* DELETE /api/trade-in/receipts/[id] — kun kladder */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { id } = await params;
    const existing = await loadReceiptForActor(staff.actor, id);
    if (existing.status !== "draft") return LOCKED();

    const supabase = createServerClient();
    const { error } = await supabase.from("trade_in_receipts").delete().eq("id", id).eq("status", "draft");
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke slette kladden");
  }
}
