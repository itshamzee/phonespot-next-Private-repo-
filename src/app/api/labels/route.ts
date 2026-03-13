import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateDeviceLabels, generateSkuLabels } from "@/lib/labels/generate";

/**
 * POST /api/labels
 * Generate price label PDFs for devices or SKU products.
 *
 * Body: { type: "device" | "sku", ids: string[] }
 * Access: Staff only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Kun medarbejdere kan generere prisskilte" }, { status: 403 });
    }

    const body = await request.json();
    const { type, ids } = body;

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Angiv type ('device' eller 'sku') og ids (array)" },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Maks 100 labels ad gangen" },
        { status: 400 }
      );
    }

    let pdfBuffer: Buffer;

    if (type === "device") {
      pdfBuffer = await generateDeviceLabels(ids);
    } else if (type === "sku") {
      pdfBuffer = await generateSkuLabels(ids);
    } else {
      return NextResponse.json(
        { error: "Ugyldig type — brug 'device' eller 'sku'" },
        { status: 400 }
      );
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="phonespot-prisskilte-${type}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Label generation error:", err);
    return NextResponse.json(
      { error: "Fejl ved generering af prisskilte" },
      { status: 500 }
    );
  }
}
