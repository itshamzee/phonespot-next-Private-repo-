// src/app/api/trade-in/[id]/upload-label/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: offerId } = await params;
  const supabase = createServerClient();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const trackingNumber = formData.get("tracking_number") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate: PDF only, max 10MB
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const fileName = `label-${offerId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from("shipping-labels")
    .upload(fileName, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: urlData } = await supabase.storage
    .from("shipping-labels")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // Upsert shipping_labels
  const { data: existing } = await supabase
    .from("shipping_labels").select("id").eq("offer_id", offerId).single();

  if (existing) {
    await supabase.from("shipping_labels").update({
      label_url: urlData?.signedUrl || "",
      tracking_number: trackingNumber,
    }).eq("id", existing.id);
  } else {
    await supabase.from("shipping_labels").insert({
      offer_id: offerId,
      provider: "manual",
      tracking_number: trackingNumber,
      label_url: urlData?.signedUrl || "",
      status: "label_created",
    });
  }

  return NextResponse.json({ success: true, label_url: urlData?.signedUrl });
}
