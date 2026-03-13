import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateSaftExport } from "@/lib/accounting/saft-export";

/**
 * GET /api/accounting/saft?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Generate SAF-T XML export for Danish SKAT compliance.
 * Staff only (manager/owner).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Auth check — manager/owner only
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
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    if (!staff || !["manager", "owner"].includes(staff.role)) {
      return NextResponse.json({ error: "Kun ledere kan eksportere regnskabsdata" }, { status: 403 });
    }

    // Parse date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Angiv start og end dato (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Ugyldigt datoformat. Brug YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const xml = await generateSaftExport({ startDate, endDate });

    // Log the export
    await supabase.from("activity_log").insert({
      action: "saft_export",
      entity_type: "accounting",
      entity_id: `${startDate}_${endDate}`,
      details: { start: startDate, end: endDate, exported_by: staff.id },
      staff_id: staff.id,
    });

    const filename = `saft-export-${startDate}-to-${endDate}.xml`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("SAF-T export error:", err);
    return NextResponse.json({ error: "Eksport fejlede" }, { status: 500 });
  }
}
