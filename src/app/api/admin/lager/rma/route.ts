import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { canSee } from "@/lib/auth/store-scope-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { actorLabel, canUseLocation, PHONESPOT_LOCATION_CODES } from "@/lib/lagersystem/locations";
import { addPart, removePart } from "@/lib/lagersystem/repair-parts";
import { isRmaStatus, rmaKeyForTicketPart } from "@/lib/lagersystem/rma";
import { rmaForStaff } from "@/lib/lagersystem/rma-server";
import { scheduleSend } from "@/lib/lagersystem/send-after";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";
import type { RepairPartRow } from "@/lib/lagersystem/types";

export const runtime = "nodejs";

const Register = z
  .object({
    idempotency_key: z.string().uuid(),
    location: z.enum(PHONESPOT_LOCATION_CODES),
    shared_sku: z.string().trim().min(1).max(100),
    qty: z.number().int().min(1).max(100),
    reason: z.string().trim().min(1, "Beskriv fejlen").max(500),
    supplier: z.string().trim().max(100).optional(),
    reference: z.string().trim().max(100).optional(),
    ticket_id: z.string().uuid().optional(),
    part_id: z.string().uuid().optional(),
  })
  .refine((b) => !b.part_id || !!b.ticket_id, { message: "Delen skal høre til en sag", path: ["ticket_id"] });

/** GET ?location=&status= — reklamationer for en lokation, medarbejderen må bruge (spec §4.3b). */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const location = req.nextUrl.searchParams.get("location") ?? "";
  if (!canUseLocation(staff, location)) return forbiddenLocation();
  const status = (req.nextUrl.searchParams.get("status") ?? "").split(",").filter(isRmaStatus);
  try {
    const items = await client.listRma({ location, ...(status.length ? { status } : {}) });
    return NextResponse.json({ items: items.map((i) => rmaForStaff(staff, i)) });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}

/**
 * POST — "Registrér defekt del". Fra en sag: sagsnummeret bliver reference.
 * Fra en "Dele brugt"-række: lokation/del kommer fra rækken, og delen fjernes
 * fra sagen (RETURN), så DEFECT_OUT ikke trækker den samme del to gange.
 */
export async function POST(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const parsed = Register.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });
  const b = parsed.data;

  let location: string = b.location;
  let sharedSku = b.shared_sku;
  let reference = b.reference || undefined;
  let key = `admin:${b.idempotency_key}`;
  const repo = b.ticket_id ? createSupabaseRepairPartsRepo(createAdminClient()) : null;
  let claimed: RepairPartRow | null = null;

  if (b.ticket_id && repo) {
    const ticket = await repo.getTicket(b.ticket_id);
    if (!ticket || !canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
    reference = ticket.ticket_number ?? ticket.id;
    if (b.part_id) {
      const part = await repo.getPart(b.part_id);
      if (!part || part.ticket_id !== ticket.id || part.movement_type !== "TAKE" || part.voided_at) {
        return NextResponse.json({ error: "Delen findes ikke på sagen" }, { status: 404 });
      }
      if (b.qty > part.qty) return NextResponse.json({ error: `Der er kun brugt ${part.qty} på sagen` }, { status: 400 });
      location = part.location_code;
      sharedSku = part.shared_sku;
      key = rmaKeyForTicketPart(ticket.id, part.id);
      claimed = part;
    }
  }
  if (!canUseLocation(staff, location)) return forbiddenLocation();

  let result;
  try {
    result = await client.createRma({
      idempotency_key: key,
      location,
      shared_sku: sharedSku,
      qty: b.qty,
      reason: b.reason,
      ...(b.supplier ? { supplier: b.supplier } : {}),
      ...(reference ? { reference } : {}),
      actor_label: actorLabel(staff),
    });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }

  // Fra en "Dele brugt"-række: hele rækken returneres (RETURN), og de gode enheder lægges
  // tilbage på sagen som et nyt udtag, så de ikke bogføres tilbage på lager.
  let part_removed = false;
  let readded_qty = 0;
  let warning: string | null = null;
  if (claimed && b.ticket_id && repo) {
    try {
      const removed = await removePart(repo, { ticketId: b.ticket_id, partId: claimed.id, staff });
      if (removed.ok) {
        scheduleSend(removed.value, repo);
        part_removed = true;
      }
    } catch (err) {
      console.error("[reklamation] kunne ikke fjerne delen fra sagen", claimed.id, err);
    }
    const rest = claimed.qty - b.qty;
    if (!part_removed) {
      warning = "Defekt del registreret, men delen kunne ikke fjernes fra sagen. Fjern den under Dele brugt.";
    } else if (rest > 0) {
      try {
        const readded = await addPart(repo, {
          ticketId: b.ticket_id, sharedSku: claimed.shared_sku, partName: claimed.part_name, qty: rest,
          costPriceOre: claimed.cost_at_time_ore, staff,
        });
        if (readded.ok) {
          scheduleSend(readded.value, repo);
          readded_qty = rest;
        } else {
          console.error("[reklamation] kunne ikke lægge resterende dele tilbage", claimed.id, readded.message);
        }
      } catch (err) {
        console.error("[reklamation] kunne ikke lægge resterende dele tilbage", claimed.id, err);
      }
      if (readded_qty === 0) {
        warning = `Defekt del registreret, men de ${rest} resterende stk. kunne ikke lægges tilbage på sagen. Tilføj dem under Dele brugt.`;
      }
    }
  }
  return NextResponse.json(
    { item: rmaForStaff(staff, result.item), part_removed, readded_qty, warning },
    { status: result.replayed ? 200 : 201 },
  );
}
