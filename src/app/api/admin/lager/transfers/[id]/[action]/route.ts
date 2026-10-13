import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { isOwner } from "@/lib/auth/store-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Transfer } from "@/lib/lagersystem/api-types";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { actorLabel, canManageStock, canRequestTo, canUseLocation } from "@/lib/lagersystem/locations";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { syncTicketsForTransfer } from "@/lib/lagersystem/ticket-transfers";
import { createSupabaseTicketTransfersRepo } from "@/lib/lagersystem/ticket-transfers-repo";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; action: string }> };

const SendBody = z.object({ lines: z.array(z.object({ shared_sku: z.string().min(1).max(100), qty_sent: z.number().int().min(0).max(1000) })).max(50).optional() });
const ReceiveBody = z.object({
  idempotency_key: z.string().uuid().optional(),
  lines: z
    .array(
      z.object({
        shared_sku: z.string().min(1).max(100),
        qty_received: z.number().int().min(0).max(1000),
        qty_written_off: z.number().int().min(0).max(1000).optional(),
        write_off_reason: z.string().trim().max(300).optional(),
      }).refine((l) => !l.qty_written_off || !!l.write_off_reason, { message: "Afskrivning kræver en begrundelse" }),
    )
    .min(1)
    .max(50),
});
const RejectBody = z.object({ reason: z.string().trim().min(1, "Angiv en begrundelse").max(300) });

type Staff = NonNullable<Awaited<ReturnType<typeof requireStaff>>>;

/**
 * Spec §3.5 Rettigheder, set fra PhoneSpots side: send/afvis = afsenderens butik,
 * modtag = modtagerens butik, annullér = kun PhoneSpots egne anmodninger og kun
 * anmoderens side. Lagersystemet håndhæver firmaet; her håndhæves butikken.
 */
function mayAct(staff: Staff, action: "send" | "receive" | "reject" | "cancel", t: Transfer): boolean {
  switch (action) {
    case "send":
    case "reject":
      return canUseLocation(staff, t.from);
    case "receive":
      return canUseLocation(staff, t.to);
    case "cancel":
      return t.requested_by_company === "phonespot" && canRequestTo(staff, t.to);
  }
}

/** POST /transfers/:id/(send|receive|reject|cancel) — synkront mod lagersystemet (spec §4.3a). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const { id, action } = await params;
  if (action !== "send" && action !== "receive" && action !== "reject" && action !== "cancel") {
    return NextResponse.json({ error: "Ukendt handling" }, { status: 404 });
  }
  if (!id || id.length > 100) return NextResponse.json({ error: "Flytningen findes ikke." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const actor_label = actorLabel(staff);

  let run: () => Promise<Transfer>;
  if (action === "send") {
    const p = SendBody.safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Ugyldige antal" }, { status: 400 });
    run = () => client.sendTransfer(id, { actor_label, ...(p.data.lines ? { lines: p.data.lines } : {}) });
  } else if (action === "receive") {
    const p = ReceiveBody.safeParse(body);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Ugyldige antal" }, { status: 400 });
    // Afskrivning er en nedskrivning: kun ejer/leder, som WRITE_OFF på /movements.
    if (p.data.lines.some((l) => (l.qty_written_off ?? 0) > 0) && !canManageStock(staff)) {
      return NextResponse.json({ error: "Kun ejer eller leder kan afskrive dele." }, { status: 403 });
    }
    const key = p.data.idempotency_key;
    run = () => client.receiveTransfer(id, { actor_label, ...(key ? { idempotency_key: `admin:${key}` } : {}), lines: p.data.lines });
  } else if (action === "reject") {
    const p = RejectBody.safeParse(body);
    if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Angiv en begrundelse" }, { status: 400 });
    run = () => client.rejectTransfer(id, { actor_label, reason: p.data.reason });
  } else {
    run = () => client.cancelTransfer(id, { actor_label });
  }

  try {
    // Butiksafgrænsning: lokationerne læses fra lagersystemet, aldrig fra klienten.
    if (!isOwner(staff) && !mayAct(staff, action, await client.getTransfer(id))) return forbiddenLocation();
    const transfer = await run();
    try {
      const sb = createAdminClient();
      await syncTicketsForTransfer(transfer, { parts: createSupabasePartsCheckRepo(sb), links: createSupabaseTicketTransfersRepo(sb) });
    } catch (err) {
      console.error("[flytninger] kunne ikke opdatere sager", id, err);
    }
    return NextResponse.json({ transfer });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
