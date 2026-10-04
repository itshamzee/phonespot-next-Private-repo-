import { NextResponse } from "next/server";
import { isOwner, staffStoreSlug } from "@/lib/auth/store-scope";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { listTransfers, requestTransfer } from "@/lib/transfers/service";
import { badRequest, readJson, requestSchema, transferErrorResponse } from "@/lib/transfers/route-helpers";
import { TransferError } from "@/lib/transfers/errors";

/** GET /api/admin/transfers — overførsler synlige for medarbejderen (afgrænset på serveren). */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  try {
    const transfers = await listTransfers(ctx.staff, ctx.scope);
    return NextResponse.json({ transfers }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return transferErrorResponse(err, "Overførslerne kunne ikke hentes");
  }
}

/**
 * POST /api/admin/transfers — anmod om varer fra en anden butik.
 * Body: { fromSlug, toSlug?, note?, lines: [{skuProductId, qty} | {deviceId} | {templateId, storage, grade, qty}] }
 * Medarbejdere anmoder altid til deres egen butik; ejeren angiver toSlug.
 */
export async function POST(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Ugyldig anmodning", parsed.error.issues);
  const { staff } = ctx;

  const toSlug = isOwner(staff) ? parsed.data.toSlug : staffStoreSlug(staff);
  if (!toSlug) {
    return transferErrorResponse(
      new TransferError("forbidden_location", isOwner(staff) ? "Vælg hvilken butik varerne skal til." : "Du er ikke tilknyttet en butik.", isOwner(staff) ? 400 : 403),
      "",
    );
  }
  try {
    const result = await requestTransfer(staff, {
      fromSlug: parsed.data.fromSlug,
      toSlug,
      lines: parsed.data.lines,
      note: parsed.data.note ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return transferErrorResponse(err, "Anmodningen kunne ikke oprettes");
  }
}
