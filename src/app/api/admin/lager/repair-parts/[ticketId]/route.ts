import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canSee } from "@/lib/auth/store-scope-server";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { NOT_ENABLED } from "@/lib/lagersystem/http";
import { locationForStore } from "@/lib/lagersystem/locations";
import { addPart } from "@/lib/lagersystem/repair-parts";
import { scheduleSend } from "@/lib/lagersystem/send-after";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";

export const runtime = "nodejs";


type Ctx = { params: Promise<{ ticketId: string }> };
const TicketId = z.string().uuid();
const AddBody = z.object({
  shared_sku: z.string().trim().min(1).max(100),
  part_name: z.string().trim().min(1).max(300),
  qty: z.number().int().min(1).max(100),
  cost_price_ore: z.number().int().min(0).nullable().optional(),
});

/** GET — dele på sagen + hvilken lokation sagen trækker fra. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLagersystemClient()) return NextResponse.json({ enabled: false });

  const { ticketId } = await params;
  if (!TicketId.safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const repo = createSupabaseRepairPartsRepo(createAdminClient());
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  if (!canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const parts = await repo.listForTicket(ticketId);
  return NextResponse.json({ enabled: true, location: locationForStore(ticket.store_id), parts });
}

/** POST — registrér en brugt del (TAKE). Gemmes lokalt først, sendes via after(). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLagersystemClient()) return NextResponse.json(NOT_ENABLED, { status: 404 });

  const { ticketId } = await params;
  if (!TicketId.safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const parsed = AddBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige data" }, { status: 400 });

  const repo = createSupabaseRepairPartsRepo(createAdminClient());
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  if (!canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const result = await addPart(repo, {
    ticketId,
    sharedSku: parsed.data.shared_sku,
    partName: parsed.data.part_name,
    qty: parsed.data.qty,
    costPriceOre: parsed.data.cost_price_ore ?? null,
    staff,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  scheduleSend(result.value, repo);
  return NextResponse.json({ part: result.value }, { status: 201 });
}
