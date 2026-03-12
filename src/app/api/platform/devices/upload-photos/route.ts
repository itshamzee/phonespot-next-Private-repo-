// POST /api/platform/devices/upload-photos
// Accepts multipart form data with files[] and device_id
// Uploads to Supabase Storage bucket "device-photos"
// Returns array of public URLs

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const formData = await request.formData();
  const deviceId = formData.get("device_id") as string;
  const files = formData.getAll("files") as File[];

  if (!deviceId) {
    return NextResponse.json({ error: "device_id is required" }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${deviceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("device-photos")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from("device-photos")
      .getPublicUrl(fileName);

    uploadedUrls.push(urlData.publicUrl);
  }

  const { data: device } = await supabase
    .from("devices")
    .select("photos")
    .eq("id", deviceId)
    .single();

  const existingPhotos = device?.photos ?? [];
  const allPhotos = [...existingPhotos, ...uploadedUrls];

  await supabase
    .from("devices")
    .update({ photos: allPhotos, updated_at: new Date().toISOString() })
    .eq("id", deviceId);

  return NextResponse.json({ urls: uploadedUrls, total: allPhotos.length });
}
