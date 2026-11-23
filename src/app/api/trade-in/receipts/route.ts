import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { assertLocationAccess } from "@/lib/pos/pos-context";
import { posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { receiptDraftSchema } from "@/lib/opkoeb/schemas";
import {
  accessibleLocationIds,
  assertReceiptVisible,
  assertInquiryLinkable,
  attestationFor,
  offerUsedConflict,
  checkStamps,
  draftColumns,
  itemRows,
  itemsTotal,
  sanitizeReceipt,
  withStaffNames,
  type ReceiptRow,
} from "@/lib/opkoeb/receipt-access";

const MAX_INQUIRY_IDS = 200;
const LIST_COLUMNS =
  "id, receipt_number, status, total_amount, offset_amount, location_id, inquiry_id, seller_name, seller_type, attestation, created_at, confirmed_at, paid_at, created_by, suspected_at, signed_scan_path, invoice_file_path, payout_proof_path";
const STATUSES = ["draft", "confirmed", "paid", "completed", "voided"];

const uuidSchema = z.string().uuid();
const BAD_INQUIRY = () => NextResponse.json({ error: "Ugyldigt henvendelses-id" }, { status: 400 });

const createSchema = receiptDraftSchema.extend({ location_id: z.string().uuid("Vælg en butik") });

/**
 * GET /api/trade-in/receipts
 *   ?inquiry_ids=a,b      status pr. henvendelse (ingen persondata, butiksafgrænset)
 *   ?inquiry_id=x         sedlerne på én henvendelse, med varer
 *   ?number=SS-2026-0001  højst én seddel, kun i aktørens butikker (kassen)
 *   ?location_id=&status=&limit=  liste, afgrænset til aktørens butikker
 */
export async function GET(req: Request) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const sp = new URL(req.url).searchParams;
    const supabase = createServerClient();

    const inquiryIds = sp.get("inquiry_ids");
    if (inquiryIds !== null) {
      const ids = inquiryIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > MAX_INQUIRY_IDS) {
        return NextResponse.json({ error: `Højst ${MAX_INQUIRY_IDS} henvendelser ad gangen` }, { status: 400 });
      }
      if (ids.length === 0) return NextResponse.json([]);
      if (!ids.every((i) => uuidSchema.safeParse(i).success)) return BAD_INQUIRY();
      const allowedForIds = await accessibleLocationIds(actor);
      let idsQuery = supabase
        .from("trade_in_receipts")
        .select("inquiry_id, status, total_amount, created_at, confirmed_at, paid_at")
        .in("inquiry_id", ids);
      if (allowedForIds) idsQuery = idsQuery.in("location_id", allowedForIds);
      const { data, error } = await idsQuery;
      if (error) throw new Error(error.message);
      return NextResponse.json(data ?? []);
    }

    const number = sp.get("number");
    if (number !== null) {
      // Slutseddelnumre er A-Z, 0-9 og bindestreg; alt andet kan ikke matche (og ingen LIKE-jokertegn).
      const wanted = number.trim();
      if (!/^[A-Za-z0-9-]{1,40}$/.test(wanted)) return NextResponse.json([]);
      const { data, error } = await supabase
        .from("trade_in_receipts")
        .select(`${LIST_COLUMNS}, seller_bank_reg, seller_bank_account`)
        .ilike("receipt_number", wanted)
        .limit(1);
      if (error) throw new Error(error.message);
      const row = (data ?? [])[0] as ReceiptRow | undefined;
      if (!row) return NextResponse.json([]);
      try {
        await assertReceiptVisible(actor, row);
      } catch {
        return NextResponse.json([]);
      }
      const s = sanitizeReceipt(row, { bankAccount: "omit" });
      return NextResponse.json([
        {
          id: s.id,
          receipt_number: s.receipt_number,
          status: s.status,
          total_amount: s.total_amount,
          offset_amount: s.offset_amount,
          location_id: s.location_id,
          attestation: s.attestation,
          seller_type: s.seller_type,
          has_signed_scan: s.has_signed_scan,
          has_invoice: s.has_invoice,
          // Et restbeløb efter modregning udbetales til bank og kræver konto på sedlen.
          has_bank_account: s.has_bank_account,
          // Kassen viser, hvorfor en seddel under mistanke ikke kan modregnes.
          suspected: s.suspected_at != null,
        },
      ]);
    }

    const allowed = await accessibleLocationIds(actor);
    const inquiryId = sp.get("inquiry_id");
    if (inquiryId) {
      if (!uuidSchema.safeParse(inquiryId).success) return BAD_INQUIRY();
      let q = supabase
        .from("trade_in_receipts")
        .select("*, trade_in_receipt_items(*)")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: false });
      if (allowed) q = q.in("location_id", allowed);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return NextResponse.json((data ?? []).map((r) => sanitizeReceipt(r as ReceiptRow, { bankAccount: "draft-only" })));
    }

    const locationId = sp.get("location_id");
    if (locationId) await assertLocationAccess(actor, locationId);
    const status = sp.get("status");
    if (status && !STATUSES.includes(status)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }
    const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "50", 10) || 50, 1), 200);

    let q = supabase
      .from("trade_in_receipts")
      .select(`${LIST_COLUMNS}, trade_in_receipt_items(id)`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (locationId) q = q.eq("location_id", locationId);
    if (allowed) q = q.in("location_id", allowed);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    // Listen viser kun antallet af enheder, ikke selve varerne.
    const listed = (data ?? []).map((r) => {
      const { trade_in_receipt_items: items, ...row } = r as ReceiptRow & { trade_in_receipt_items?: unknown[] };
      return { ...sanitizeReceipt(row as ReceiptRow, { bankAccount: "omit" }), item_count: items?.length ?? 0 };
    });
    return NextResponse.json(await withStaffNames(listed, ["created_by"]));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke hente slutsedler");
  }
}

/**
 * POST /api/trade-in/receipts: opretter en kladde. Butikken skal være en,
 * aktøren har adgang til. Nummer, firma og bekræftelse hører til trade_in_confirm.
 */
export async function POST(req: Request) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
    }
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
    }
    // Den gamle slutseddelside sender butikken som store_location_id.
    const body = raw as Record<string, unknown>;
    const parsed = createSchema.safeParse({ ...body, location_id: body.location_id ?? body.store_location_id });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || "Ugyldig forespørgsel", path: issue?.path.join(".") },
        { status: 400 },
      );
    }
    const { location_id, items = [], ...draft } = parsed.data;

    await assertLocationAccess(actor, location_id);
    await assertInquiryLinkable(actor, draft.inquiry_id);

    // Ingen receipt_number her: kolonnen har ingen default, og en kladde har intet nummer.
    const now = new Date().toISOString();
    const fields = draftColumns(draft);
    if (fields.offer_id !== undefined) {
      fields.attestation = await attestationFor({
        offerId: fields.offer_id,
        inquiryId: fields.inquiry_id,
        receiptId: null,
        totalOere: itemsTotal(items),
      });
    }
    const supabase = createServerClient();
    const { data: receipt, error: receiptErr } = await supabase
      .from("trade_in_receipts")
      .insert({
        seller_name: "",
        ...fields,
        location_id,
        created_by: actor.id,
        total_amount: itemsTotal(items),
        ...checkStamps(fields, null, actor.id, now, { lock: true, id: true }),
      })
      .select("id")
      .single();
    if (receiptErr || !receipt) throw offerUsedConflict(receiptErr) ?? new Error(receiptErr?.message ?? "Failed to create receipt");

    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from("trade_in_receipt_items").insert(itemRows(receipt.id, items));
      if (itemsErr) {
        await supabase.from("trade_in_receipts").delete().eq("id", receipt.id);
        throw new Error(itemsErr.message);
      }
    }

    const { data: complete, error: loadErr } = await supabase
      .from("trade_in_receipts")
      .select("*, trade_in_receipt_items(*)")
      .eq("id", receipt.id)
      .single();
    if (loadErr || !complete) throw new Error(loadErr?.message ?? "Failed to load receipt");
    return NextResponse.json(sanitizeReceipt(complete as ReceiptRow, { bankAccount: "draft-only" }), { status: 201 });
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke oprette kladden");
  }
}
