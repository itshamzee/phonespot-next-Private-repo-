// GET /api/platform/stock-summary — aggregated stock counts by model + location
// Returns a pivot table: each row is a product template, columns are locations

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const params = request.nextUrl.searchParams;
  const category = params.get("category");

  // Fetch all in-stock devices with their template and location
  const needsInner = !!category;
  const templateJoin = needsInner
    ? "template:product_templates!inner(id, display_name, category)"
    : "template:product_templates(id, display_name, category)";

  let query = supabase
    .from("devices")
    .select(`template_id, location_id, status, ${templateJoin}, location:locations(id, name)`)
    .in("status", ["intake", "graded", "listed"]);

  if (category) {
    query = query.eq("template.category", category);
  }

  const { data: devices, error: devError } = await query;

  if (devError) {
    return NextResponse.json({ error: devError.message }, { status: 500 });
  }

  // Fetch all locations for column headers
  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 });
  }

  // Build pivot: { templateId -> { locationId -> count } }
  const pivot = new Map<
    string,
    { templateName: string; counts: Map<string, number>; total: number }
  >();

  for (const device of devices ?? []) {
    const templateId = device.template_id;
    const locationId = device.location_id;
    const tpl = device.template as { display_name: string } | { display_name: string }[] | null;
    const templateName = Array.isArray(tpl)
      ? tpl[0]?.display_name ?? "Ukendt"
      : tpl?.display_name ?? "Ukendt";

    if (!templateId) continue;

    if (!pivot.has(templateId)) {
      pivot.set(templateId, {
        templateName,
        counts: new Map(),
        total: 0,
      });
    }

    const row = pivot.get(templateId)!;
    row.counts.set(locationId, (row.counts.get(locationId) ?? 0) + 1);
    row.total += 1;
  }

  // Convert to serializable format, sorted alphabetically by template name
  const rows = Array.from(pivot.entries())
    .map(([templateId, row]) => ({
      templateId,
      templateName: row.templateName,
      counts: Object.fromEntries(row.counts),
      total: row.total,
    }))
    .sort((a, b) => a.templateName.localeCompare(b.templateName, "da"));

  // Location totals
  const locationTotals: Record<string, number> = {};
  for (const loc of locations ?? []) {
    locationTotals[loc.id] = rows.reduce(
      (sum, r) => sum + (r.counts[loc.id] ?? 0),
      0,
    );
  }

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return NextResponse.json({
    locations: locations ?? [],
    rows,
    locationTotals,
    grandTotal,
  });
}
