import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";
import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { PosError } from "@/lib/pos/errors";
import { loadReceiptForActor, sanitizeReceipt } from "@/lib/opkoeb/receipt-access";
import { UPLOAD_COLUMN, uploadKindSchema } from "@/lib/opkoeb/schemas";

const BUCKET = "slutsedler";
// Vercel afviser forespørgsler over ca. 4,5 MB; browseren komprimerer fotos før upload.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPE_EXT: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/heic": ["heic", "heif"],
  "image/heif": ["heic", "heif"],
  "application/pdf": ["pdf"],
};

const bad = (msg: string) => new PosError("upload_invalid", msg, 400);

/**
 * POST /api/trade-in/receipts/[id]/upload (multipart: kind, file): lægger den underskrevne
 * slutseddel, firmafakturaen eller udbetalingsbeviset privat i bucket 'slutsedler'.
 * Nyeste upload erstatter stien; gamle objekter bliver liggende.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw bad("Ugyldig forespørgsel");
    }
    const kindParsed = uploadKindSchema.safeParse(form.get("kind"));
    if (!kindParsed.success) throw bad("Ugyldig filtype");
    const kind = kindParsed.data;
    const file = form.get("file");
    if (!(file instanceof File)) throw bad("Vælg en fil");

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    // Nogle browsere sender ingen type (eller octet-stream) for HEIC/HEIF; så afgør filendelsen.
    const untyped = !file.type || file.type === "application/octet-stream";
    const type = untyped && (ext === "heic" || ext === "heif") ? `image/${ext}` : file.type;
    if (!TYPE_EXT[type]?.includes(ext)) throw bad("Filen skal være JPG, PNG, HEIC eller PDF");
    if (file.size === 0) throw bad("Filen er tom");
    if (file.size > MAX_BYTES) throw bad("Filen er for stor (maks. 4 MB). Tag billedet igen eller gem PDF'en mindre.");

    const business = row.seller_type === "business";
    if (kind === "invoice" && !business) throw bad("Faktura kan kun lægges op på firmaopkøb");
    if (kind === "signed_scan" && business) throw bad("Underskrevet slutseddel hører til private opkøb");

    const receiptNumber = row.receipt_number;
    if ((row.status !== "confirmed" && row.status !== "paid") || typeof receiptNumber !== "string" || !receiptNumber) {
      throw new PosError("receipt_not_uploadable", "Der kan kun lægges filer op på en bekræftet slutseddel", 409);
    }

    const supabase = createServerClient();
    const key = `${receiptNumber}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, Buffer.from(await file.arrayBuffer()), { contentType: type, upsert: false });
    if (upErr) {
      console.error("[opkoeb] storage upload failed", receiptNumber, upErr.message);
      throw new PosError("storage_failed", "Filen kunne ikke gemmes", 500);
    }

    const { data, error } = await supabase
      .from("trade_in_receipts")
      .update({ [UPLOAD_COLUMN[kind]]: key })
      .eq("id", id)
      .in("status", ["confirmed", "paid"])
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`upload path: ${error.message}`);
    if (!data) throw new PosError("receipt_changed", "Slutsedlen er ændret. Genindlæs og prøv igen.", 409);

    await logActivity({
      supabase,
      actorId: actor.id,
      action: "opkoeb_upload",
      entityType: "trade_in_receipt",
      entityId: id,
      details: { kind, receipt_number: receiptNumber },
    });

    return NextResponse.json(sanitizeReceipt(data as Record<string, unknown>, { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke gemme filen");
  }
}
