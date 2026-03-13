import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/discount-codes
 * List all discount codes. Staff only.
 *
 * POST /api/discount-codes
 * Create a new discount code. Manager/owner only.
 * Body: { code, type, value, minOrderAmount?, validFrom?, validUntil?, usageLimit? }
 */

export async function GET(request: NextRequest) {
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
      .select("id")
      .eq("auth_id", user.id)
      .single();
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: codes, error } = await supabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ codes: codes ?? [] });
  } catch (err) {
    console.error("Discount codes list error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}

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
      .select("id, role")
      .eq("auth_id", user.id)
      .single();

    if (!staff || !["manager", "owner"].includes(staff.role)) {
      return NextResponse.json(
        { error: "Kun managere og ejere kan oprette rabatkoder" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, type, value, minOrderAmount, validFrom, validUntil, usageLimit } = body;

    if (!code || typeof code !== "string" || code.length < 3) {
      return NextResponse.json({ error: "Kode skal vaere mindst 3 tegn" }, { status: 400 });
    }

    if (!["percentage", "fixed", "free_shipping"].includes(type)) {
      return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
    }

    if (type !== "free_shipping" && (!value || value <= 0)) {
      return NextResponse.json({ error: "Ugyldig vaerdi" }, { status: 400 });
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json({ error: "Procent kan ikke vaere over 100" }, { status: 400 });
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("code", code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Koden findes allerede" }, { status: 409 });
    }

    const { data: newCode, error: insertError } = await supabase
      .from("discount_codes")
      .insert({
        code: code.toUpperCase(),
        type,
        value: type === "free_shipping" ? 0 : value,
        min_order_amount: minOrderAmount ?? 0,
        valid_from: validFrom ?? null,
        valid_until: validUntil ?? null,
        usage_limit: usageLimit ?? null,
        times_used: 0,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from("activity_log").insert({
      actor_id: staff.id,
      actor_type: "staff",
      action: "create_discount_code",
      entity_type: "discount_code",
      entity_id: newCode.id,
      details: { code: code.toUpperCase(), type, value },
    });

    return NextResponse.json({ code: newCode }, { status: 201 });
  } catch (err) {
    console.error("Discount code create error:", err);
    return NextResponse.json({ error: "Fejl ved oprettelse" }, { status: 500 });
  }
}
