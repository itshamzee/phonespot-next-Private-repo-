import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("tc_versions")
    .select("id, version, published_at")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Kunne ikke hente handelsbetingelser" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
