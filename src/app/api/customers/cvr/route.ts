import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";
import { CvrError, lookupCvr, normalizeCvr } from "@/lib/repairs/cvr";

/** GET /api/customers/cvr?cvr=12345678[&customer_id=]: firmaoplysninger fra cvrapi.dk (cachet 30 dage). */
export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const cvr = normalizeCvr(params.get("cvr"));
  if (!cvr) return NextResponse.json({ error: "CVR-nummer skal være 8 cifre" }, { status: 400 });
  const customerId = params.get("customer_id");

  try {
    const result = await lookupCvr(cvr, createServerClient(), {
      customerId: customerId && /^[0-9a-f-]{36}$/i.test(customerId) ? customerId : null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CvrError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[customers/cvr] lookup failed:", err);
    return NextResponse.json({ error: "CVR-opslaget fejlede" }, { status: 502 });
  }
}
