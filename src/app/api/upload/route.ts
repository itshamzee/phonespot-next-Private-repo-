import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil valgt" }, { status: 400 });
  }

  const supabase = createServerClient();

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${folder ?? "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("device-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Kunne ikke uploade fil" },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage
    .from("device-photos")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl, path: fileName });
}
