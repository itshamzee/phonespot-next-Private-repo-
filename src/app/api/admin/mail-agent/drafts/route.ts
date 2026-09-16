import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/admin/mail-agent/drafts?inquiry_id=... | ?status=pending — staff only (middleware). */
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const inquiryId = req.nextUrl.searchParams.get("inquiry_id");
  const status = req.nextUrl.searchParams.get("status");

  let q = sb.from("ai_drafts").select("*").order("created_at", { ascending: false }).limit(200);
  if (inquiryId) q = q.eq("inquiry_id", inquiryId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
