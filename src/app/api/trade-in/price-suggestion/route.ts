import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateBuyback } from "@/lib/buyback/estimate";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import type { BuybackCondition, BuybackDevice } from "@/lib/buyback/types";
import { greenUrl } from "@/lib/opkoeb/green-link";
import { parseBody, posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";

const bodySchema = z.object({
  template_id: z.string().uuid("Ugyldig model"),
  storage: z.string().trim().max(40).optional(),
  condition: z.enum(["Perfekt", "God", "Acceptabel", "Defekt"]),
  battery_health: z.number().int().min(0).max(100).optional(),
  find_my_off: z.boolean(),
});

type Body = z.infer<typeof bodySchema>;

function deviceTypeFor(category: string | null): string {
  const c = (category ?? "").toLowerCase();
  if (c === "iphone" || c === "smartphone") return "Telefon";
  if (c === "ipad" || c === "tablet") return "Tablet";
  if (c === "macbook" || c === "laptop") return "Laptop";
  return category ?? "";
}

// Strings are the wizard options fault-mapping.ts knows: "God (80%+)" is the
// only battery value that is not a deduction.
function batteryLabel(health: number | undefined): string {
  if (health === undefined || health >= 80) return "God (80%+)";
  return health >= 60 ? "Okay (60-80%)" : "Dårligt (<60%)";
}

function conditionFor(b: Body): BuybackCondition {
  return {
    screen: "Perfekt",
    back: b.condition === "Acceptabel" ? "Ridser" : "Perfekt",
    battery: batteryLabel(b.battery_health),
    allWorking: b.condition === "Defekt" ? "Nej" : "Ja",
    brokenParts: [],
    cloudLocked: b.find_my_off ? "Nej" : "Ja",
  };
}

export async function POST(request: Request) {
  try {
    const staff = await requirePosStaff(request);
    if (!staff) return UNAUTHORIZED();

    const parsed = await parseBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const b = parsed.data;

    const client = createAdminClient();
    const { data: template, error } = await client
      .from("product_templates")
      .select("brand, model, category, storage_options")
      .eq("id", b.template_id)
      .maybeSingle();
    if (error) throw error;
    if (!template) return NextResponse.json({ error: "Modellen findes ikke" }, { status: 404 });

    const storage = b.storage ?? "";
    const device: BuybackDevice = {
      deviceType: deviceTypeFor(template.category),
      brand: template.brand ?? "",
      model: template.model ?? "",
      storage,
      ram: "",
      useCustom: false,
      brandCustom: "",
      modelCustom: "",
    };

    const settings = await loadBuybackSettings(client);
    const result = await estimateBuyback(client, device, conditionFor(b), settings);

    // The engine does not read allWorking, so a defective device would be priced
    // as a working one. Never auto-price it.
    const manual = result.status === "manual" || b.condition === "Defekt";
    const manualReason =
      result.status === "manual"
        ? result.manualReason
        : b.condition === "Defekt"
          ? "Defekt enhed prissættes manuelt"
          : undefined;

    return NextResponse.json({
      status: manual ? "manual" : "ok",
      aim_oere: manual ? 0 : result.aimOfferOre,
      floor_oere: manual ? 0 : result.floorOfferOre,
      ...(manualReason ? { manual_reason: manualReason } : {}),
      green_url: greenUrl(device.brand, device.model, storage || undefined),
    });
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke beregne prisforslag");
  }
}
