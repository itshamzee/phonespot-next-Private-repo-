import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { suggestForLead } from "@/lib/buyback/suggest";
import { explainPricing } from "@/lib/buyback/breakdown";

/* GET /api/trade-in/suggest?inquiry_id=xxx — what the engine would offer */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) {
    return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, metadata")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const settings = await loadBuybackSettings(supabase);
  const suggestion = await suggestForLead(supabase, inquiry.metadata, settings);

  // Kroner at the edge: admin types kroner, the engine works in øre.
  return NextResponse.json({
    status: suggestion.status,
    manualReason: suggestion.manualReason ?? null,
    suggestDecline: suggestion.suggestDecline,
    totalAimKr: Math.round(suggestion.totalAimOre / 100),
    totalFloorKr: Math.round(suggestion.totalFloorOre / 100),
    devices: suggestion.perDevice.map((entry) => ({
      label: entry.label,
      explanation: explainPricing(entry.result),
      manualReason: entry.result.manualReason ?? null,
      aimKr: Math.round(entry.result.aimOfferOre / 100),
    })),
  });
}
