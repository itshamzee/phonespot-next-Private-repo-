import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { actorLabel, canRequestTo, canUseLocation, isPhoneSpotLocation, PHONESPOT_LOCATION_CODES } from "@/lib/lagersystem/locations";
import { scheduleTransferMail } from "@/lib/lagersystem/transfer-after";

export const runtime = "nodejs";

const Create = z
  .object({
    idempotency_key: z.string().uuid(),
    from: z.string().trim().min(1).max(100),
    to: z.enum(PHONESPOT_LOCATION_CODES),
    shared_sku: z.string().trim().min(1).max(100),
    qty: z.number().int().min(1).max(1000),
    reference: z.string().trim().max(100).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.from !== b.to, { message: "Fra og til skal være forskellige", path: ["from"] });

/** GET ?location=&direction= — flytninger for Hovedlager Vejle og PhoneSpots egne butikker (spec §4.3a). */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const location = req.nextUrl.searchParams.get("location");
  if (!isPhoneSpotLocation(location)) return NextResponse.json({ error: "Ukendt lokation" }, { status: 400 });
  // Ejeren ser alle PhoneSpot-lokationer; øvrige kun den lokation, deres butik mapper til.
  if (!canUseLocation(staff, location)) return forbiddenLocation();
  const dir = req.nextUrl.searchParams.get("direction");
  const direction = dir === "in" || dir === "out" || dir === "both" ? dir : "both";
  try {
    return NextResponse.json({ transfers: await client.listTransfers({ location, direction }) });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}

/** POST — Anmod (til-lokationen skal være Hovedlager Vejle eller anmoderens egen butik, spec §3.5). */
export async function POST(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });
  const b = parsed.data;
  if (!canRequestTo(staff, b.to)) return forbiddenLocation();
  try {
    const { transfer, replayed } = await client.createTransfer({
      idempotency_key: `admin:${b.idempotency_key}`,
      from: b.from,
      to: b.to,
      lines: [{ shared_sku: b.shared_sku, qty: b.qty }],
      reference: b.reference || null,
      note: b.note || null,
      actor_label: actorLabel(staff),
    });
    scheduleTransferMail(transfer);
    return NextResponse.json({ transfer }, { status: replayed ? 200 : 201 });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
