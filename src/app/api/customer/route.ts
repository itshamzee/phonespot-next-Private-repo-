import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/customer
 * Get current customer profile, orders, and warranties.
 * Requires Supabase auth (customer login).
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

    // Find customer linked to this auth user
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Ingen kundeprofil fundet" }, { status: 404 });
    }

    // Fetch orders
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        id, order_number, status, total, shipping_method, tracking_number,
        created_at, confirmed_at, shipped_at, delivered_at, withdrawal_token,
        order_items (
          id, item_type, quantity, unit_price, total_price,
          device:devices ( id, product_templates ( display_name ) ),
          sku_product:sku_products ( title )
        )
      `)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    // Fetch warranties
    const { data: warranties } = await supabase
      .from("warranties")
      .select(`
        id, guarantee_number, status, pdf_url, issued_at, expires_at,
        qr_verification_code,
        devices ( product_templates ( display_name ) )
      `)
      .eq("customer_id", customer.id)
      .order("issued_at", { ascending: false });

    // Fetch trade-ins
    const { data: tradeIns } = await supabase
      .from("trade_ins")
      .select("id, device_description, status, offered_price, submitted_at, paid_at")
      .eq("customer_id", customer.id)
      .order("submitted_at", { ascending: false });

    // Fetch notify requests
    const { data: notifyRequests } = await supabase
      .from("notify_requests")
      .select("id, template_id, grade_preference, status, created_at, notified_at")
      .eq("customer_email", customer.email)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        addresses: customer.addresses ?? [],
      },
      orders: orders ?? [],
      warranties: warranties ?? [],
      tradeIns: tradeIns ?? [],
      notifyRequests: notifyRequests ?? [],
    });
  } catch (err) {
    console.error("Customer portal error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}

/**
 * PATCH /api/customer
 * Update customer profile (name, phone, addresses).
 */
export async function PATCH(request: NextRequest) {
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

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Ingen kundeprofil" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.addresses !== undefined) updates.addresses = body.addresses;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Ingen aendringer" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customer.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Customer update error:", err);
    return NextResponse.json({ error: "Fejl" }, { status: 500 });
  }
}
