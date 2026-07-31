import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { signedLabelUrl, labelPathFor } from "@/lib/shipmondo/buyback-label";

/**
 * GET /api/trade-in/[id]/label — redirects to a freshly signed link to the PDF.
 *
 * [id] is the offer id. The old approach stored a signed URL in the database
 * and served it forever, so every label stopped loading a week after it was
 * created. The path is what is stored; the link is made per request.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: offerId } = await params;
  const supabase = createAdminClient();

  const { data: label } = await supabase
    .from("shipping_labels")
    .select("label_path")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (!label) return NextResponse.json({ error: "Ingen label på tilbuddet" }, { status: 404 });

  // Rows created before label_path existed still follow the naming the uploader
  // has always used, so they can be recovered rather than regenerated.
  const path = label.label_path || labelPathFor(offerId);
  const url = await signedLabelUrl(supabase, path);

  if (!url) {
    return NextResponse.json(
      { error: "Label-filen findes ikke længere — generer den igen" },
      { status: 404 },
    );
  }

  // JSON rather than a redirect: the route is staff-gated on the Authorization
  // header, and a plain link navigation would not carry it. The caller fetches
  // this and opens the returned link.
  return NextResponse.json({ url });
}
