import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { exportCustomerData } from "@/lib/gdpr";

/**
 * GET /api/gdpr/export?customer_id=xxx
 * Export all personal data for a customer (GDPR Art. 20 — data portability).
 *
 * Access: Owner role or the customer themselves (via auth).
 * Returns JSON file download.
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id");

  if (!customerId) {
    return NextResponse.json({ error: "customer_id påkrævet" }, { status: 400 });
  }

  // Authorization check: owner or the customer themselves
  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  const isOwner = staff?.role === "owner";

  if (!isOwner) {
    // Check if the requesting user is the customer
    const { data: customer } = await supabase
      .from("customers")
      .select("auth_id")
      .eq("id", customerId)
      .single();

    if (!customer || customer.auth_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const data = await exportCustomerData(customerId);

  if (!data) {
    return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="phonespot-dataudtræk-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
