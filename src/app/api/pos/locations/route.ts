import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { canAccessStore, deriveLocationSlug } from "@/lib/auth/store-scope";
import { UNAUTHORIZED, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";

/**
 * GET /api/pos/locations
 * The stores (type = 'store') the acting staff member may use, each with its
 * active registers. The owner gets every store.
 *
 * Returns: { locations: Array<{ id, slug, name, registers: Array<{ id, code, name }> }> }
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const { actor } = pos;

    const supabase = createServerClient();
    const { data: locs, error } = await supabase
      .from("locations")
      .select("id, name, slug, type")
      .eq("type", "store")
      .order("name");
    if (error) throw new Error(`Failed to load locations: ${error.message}`);

    const allowed = (locs ?? []).flatMap((l) => {
      const slug = deriveLocationSlug(l);
      return slug && canAccessStore(actor, slug) ? [{ id: l.id as string, slug, name: l.name as string }] : [];
    });
    if (allowed.length === 0) return NextResponse.json({ locations: [] });

    const { data: regs, error: regError } = await supabase
      .from("registers")
      .select("id, code, name, location_id")
      .in(
        "location_id",
        allowed.map((l) => l.id),
      )
      .eq("active", true)
      .order("code");
    if (regError) throw new Error(`Failed to load registers: ${regError.message}`);

    return NextResponse.json({
      locations: allowed.map((l) => ({
        ...l,
        registers: (regs ?? [])
          .filter((r) => r.location_id === l.id)
          .map((r) => ({ id: r.id, code: r.code, name: r.name })),
      })),
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af butikker");
  }
}
