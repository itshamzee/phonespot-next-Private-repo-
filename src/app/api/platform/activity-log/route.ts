import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/platform/activity-log
 * Browse activity log with filtering, search, and pagination.
 * Staff only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Auth — same pattern as dashboard route
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staff } = await supabase
      .from("staff")
      .select("id, role")
      .eq("auth_id", user.id)
      .single();
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq("action", action);
    }

    if (from) {
      query = query.gte("created_at", from + "T00:00:00.000Z");
    }

    if (to) {
      query = query.lte("created_at", to + "T23:59:59.999Z");
    }

    if (search) {
      // Search on text columns — JSONB search would require an RPC function
      query = query.or(`entity_type.ilike.%${search}%,action.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Activity log query error:", error);
      return NextResponse.json(
        { error: "Fejl ved hentning af aktivitetslog" },
        { status: 500 },
      );
    }

    // Resolve actor names from staff table
    const entries = data ?? [];
    const actorIds = [
      ...new Set(
        entries
          .map((e) => e.actor_id)
          .filter((id): id is string => !!id && id !== "system"),
      ),
    ];

    let staffMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: staffRows } = await supabase
        .from("staff")
        .select("id, name")
        .in("id", actorIds);

      if (staffRows) {
        staffMap = Object.fromEntries(staffRows.map((s) => [s.id, s.name]));
      }
    }

    const enriched = entries.map((entry) => ({
      ...entry,
      actor_name:
        entry.actor_id === "system" || !entry.actor_id
          ? "System"
          : staffMap[entry.actor_id] ?? "Ukendt",
    }));

    return NextResponse.json({
      data: enriched,
      total: count ?? 0,
    });
  } catch (err) {
    console.error("Activity log error:", err);
    return NextResponse.json(
      { error: "Fejl ved hentning af aktivitetslog" },
      { status: 500 },
    );
  }
}
