import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canSee } from "@/lib/auth/store-scope-server";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { requestPartForTicket } from "@/lib/lagersystem/ticket-transfers";
import { createSupabaseTicketTransfersRepo } from "@/lib/lagersystem/ticket-transfers-repo";
import { scheduleTransferMail } from "@/lib/lagersystem/transfer-after";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ ticketId: string }> };
const Body = z.object({ shared_sku: z.string().trim().min(1).max(100), from: z.string().trim().min(1).max(100) });

/** POST — "Anmod" fra mærket Skal bestilles; sagsnummeret bliver reference (spec §4.4). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const { ticketId } = await params;
  if (!z.string().uuid().safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige data" }, { status: 400 });
  const sb = createAdminClient();
  const parts = createSupabasePartsCheckRepo(sb);
  // Butiksafgrænsning før ethvert kald til lagersystemet; 404 (ikke 403) så id'er ikke kan sonderes.
  const ticket = await parts.getTicket(ticketId);
  if (!ticket || !canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  try {
    const r = await requestPartForTicket(
      { ticketId, sharedSku: parsed.data.shared_sku, from: parsed.data.from, staff },
      { parts, links: createSupabaseTicketTransfersRepo(sb), client },
    );
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status });
    scheduleTransferMail(r.value);
    return NextResponse.json({ transfer: r.value }, { status: 201 });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
