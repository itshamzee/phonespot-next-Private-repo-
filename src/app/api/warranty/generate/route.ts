import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateWarrantiesForOrder } from "@/lib/warranty/generate";

/**
 * POST /api/warranty/generate
 * Generate warranty certificates for all devices in an order.
 *
 * Body: { order_id: string }
 * Access: Staff only (employee, manager, owner).
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
      return NextResponse.json({ error: "Kun medarbejdere kan generere garantibeviser" }, { status: 403 });
    }

    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id påkrævet" }, { status: 400 });
    }

    const results = await generateWarrantiesForOrder(order_id);

    return NextResponse.json({
      success: true,
      warranties: results,
      count: results.length,
    });
  } catch (err) {
    console.error("Warranty generation error:", err);
    return NextResponse.json(
      { error: "Fejl ved generering af garantibevis" },
      { status: 500 }
    );
  }
}
