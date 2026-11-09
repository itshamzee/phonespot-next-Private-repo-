import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { PosError } from "@/lib/pos/errors";
import { loadReceiptForActor } from "@/lib/opkoeb/receipt-access";
import { uploadKindSchema, type UploadKind } from "@/lib/opkoeb/schemas";

const BUCKET = "slutsedler";
const COLUMN: Record<UploadKind, string> = {
  signed_scan: "signed_scan_path",
  invoice: "invoice_file_path",
  payout_proof: "payout_proof_path",
};

/** GET /api/trade-in/receipts/[id]/files/[kind]: 302 til en signeret URL, der gælder i 60 sekunder. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { id, kind: rawKind } = await params;
    const row = await loadReceiptForActor(staff.actor, id);

    const kind = uploadKindSchema.safeParse(rawKind);
    if (!kind.success) throw new PosError("file_not_found", "Filen findes ikke", 404);
    const stored = row[COLUMN[kind.data]];
    if (typeof stored !== "string" || !stored) throw new PosError("file_not_found", "Filen findes ikke", 404);
    const key = stored.startsWith(`${BUCKET}/`) ? stored.slice(BUCKET.length + 1) : stored;

    const { data, error } = await createServerClient().storage.from(BUCKET).createSignedUrl(key, 60);
    if (error || !data?.signedUrl) throw new PosError("file_not_found", "Filen findes ikke", 404);

    const res = NextResponse.redirect(data.signedUrl, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke hente filen");
  }
}
