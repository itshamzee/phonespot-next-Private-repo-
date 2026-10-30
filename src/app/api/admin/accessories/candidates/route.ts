import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { findCandidates } from "@/lib/accessory-intake/candidates";

/**
 * POST /api/admin/accessories/candidates — dubletsøgning igen, efter at
 * praktikanten selv har valgt model(ler) (fx et løst cover, AI'en ikke kunne
 * placere). Samme rangering som identify, uden AI-kald.
 */
const VALID_SLUGS = new Set(TILBEHOER_DEVICES.map((d) => d.slug));

const bodySchema = z.object({
  productType: z.enum(["cover", "flip_cover", "ipad_cover", "screen_protector", "bag", "other"]),
  brand: z.string().max(80).nullable().optional(),
  caseType: z.enum(["Clear", "Slim", "Rugged", "Wallet", "Flip", "Bumper"]).nullable().optional(),
  color: z.string().max(40).nullable().optional(),
  models: z.array(z.string().max(60)).max(20),
});

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige felter" }, { status: 400 });
  const b = parsed.data;
  const models = b.models.filter((m) => VALID_SLUGS.has(m));
  if (models.length === 0) return NextResponse.json({ candidates: [] });

  const { candidates } = await findCandidates(createAdminClient(), {
    productType: b.productType,
    brand: b.brand ?? null,
    isGenuineBrandProduct: false,
    models,
    unknownModelText: null,
    modelConfidence: "high",
    caseType: b.caseType ?? null,
    color: b.color ?? null,
    features: [],
    titleDa: "",
    descriptionDa: "",
    supplierCodes: [],
    readText: "",
  });
  return NextResponse.json({ candidates });
}
