import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";

/**
 * GET /api/platform/images/library?cursor=&limit=50
 * List images from the product-images storage bucket for the image library.
 * Returns public URLs sorted by most recent first.
 */
export async function GET(request: NextRequest) {
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 100);
  const offset = Number(request.nextUrl.searchParams.get("offset")) || 0;
  const search = request.nextUrl.searchParams.get("search") ?? "";

  const supabase = createAdminClient();

  // List all files in the bucket root and subfolders
  // Supabase storage.list returns files in a single folder level
  // We need to list folders first, then files within each
  const { data: topLevel, error: topErr } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });

  if (topErr) {
    return NextResponse.json({ error: topErr.message }, { status: 500 });
  }

  const allFiles: { name: string; path: string; url: string; created_at: string }[] = [];

  for (const item of topLevel ?? []) {
    if (item.id) {
      // It's a file at root level
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(item.name);
      allFiles.push({
        name: item.name,
        path: item.name,
        url: urlData.publicUrl,
        created_at: item.created_at ?? "",
      });
    } else {
      // It's a folder — list its contents
      const { data: folderFiles } = await supabase.storage
        .from(BUCKET)
        .list(item.name, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

      for (const file of folderFiles ?? []) {
        if (!file.id) continue; // skip nested folders
        const filePath = `${item.name}/${file.name}`;
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        allFiles.push({
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          created_at: file.created_at ?? "",
        });
      }
    }
  }

  // Sort by created_at descending (most recent first)
  allFiles.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  // Apply search filter if provided
  const filtered = search
    ? allFiles.filter((f) => f.path.toLowerCase().includes(search.toLowerCase()))
    : allFiles;

  // Apply pagination
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    images: paginated,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
  });
}
