import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireStaff } from "@/lib/auth/require-staff";

export async function GET(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company_name.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
