import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  REPAIR_PHOTO_BUCKET,
  REPAIR_PHOTO_URL_SECONDS,
  isRepairPhotoFolder,
} from "@/lib/repairs/photo-storage";

/**
 * Upload (kun personale, jf. middleware). Indleveringsfotos (folder intake /
 * checklist / checkout) er persondata og lægges i den PRIVATE bucket
 * `repair-photos`; svaret indeholder stien (den der gemmes i databasen) og en
 * kortlevet signeret URL til forhåndsvisning. Alt andet (fx reservedele) er
 * katalogbilleder og bliver i den offentlige `device-photos`.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil valgt" }, { status: 400 });
  }

  const supabase = createServerClient();

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `${folder ?? "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const isPrivate = isRepairPhotoFolder(folder);
  const bucket = isPrivate ? REPAIR_PHOTO_BUCKET : "device-photos";

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: `Upload fejl: ${error.message || JSON.stringify(error)}` },
      { status: 500 },
    );
  }

  if (isPrivate) {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, REPAIR_PHOTO_URL_SECONDS);
    if (signError || !data) {
      return NextResponse.json({ error: "Billedet blev gemt, men kunne ikke vises" }, { status: 500 });
    }
    return NextResponse.json({ url: data.signedUrl, path: fileName, private: true });
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return NextResponse.json({ url: urlData.publicUrl, path: fileName });
}
