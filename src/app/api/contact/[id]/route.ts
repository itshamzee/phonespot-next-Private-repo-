import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { canAccessStore } from "@/lib/auth/store-scope";
import { normalizeStoreId } from "@/lib/stores";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireInquiryAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json();

  // Man kan ikke flytte en henvendelse til en butik man ikke selv hører til.
  if (body && typeof body === "object" && "store_id" in body && !canAccessStore(access.staff, normalizeStoreId(body.store_id))) {
    return NextResponse.json({ error: "Du kan kun knytte henvendelser til din egen butik." }, { status: 403 });
  }
  const supabase = createServerClient();

  const { error } = await supabase
    .from("contact_inquiries")
    .update(body)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
