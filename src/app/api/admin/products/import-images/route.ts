import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/products/import-images — henter billeder fra leverandørens
 * CDN og lægger dem i vores eget billedlager, så produkter ikke afhænger af
 * eksterne URL'er. Bag middleware (cookie-session).
 */
const schema = z.object({
  urls: z.array(z.string().url()).min(1).max(8),
  folder: z.string().regex(/^[a-z0-9-]+$/).default("accessories"),
});

const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige billed-URL'er" }, { status: 400 });
  const { urls, folder } = parsed.data;
  const supabase = createAdminClient();

  const results: { source: string; url: string | null; error: string | null }[] = [];
  for (const source of urls) {
    try {
      const res = await fetch(source, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
          accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!res.ok) throw new Error(`Leverandøren svarede ${res.status}`);
      if (!EXT[type]) throw new Error(`Ikke et billede (${type || "ukendt type"})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) throw new Error("Billedet er over 10 MB");
      const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[type]}`;
      const { error } = await supabase.storage.from("product-images").upload(name, bytes, { contentType: type, upsert: false });
      if (error) throw new Error("Kunne ikke gemme billedet");
      const { data } = supabase.storage.from("product-images").getPublicUrl(name);
      results.push({ source, url: data.publicUrl, error: null });
    } catch (err) {
      results.push({ source, url: null, error: err instanceof Error ? err.message : "Ukendt fejl" });
    }
  }
  return NextResponse.json({ images: results.filter((r) => r.url).map((r) => r.url), failed: results.filter((r) => !r.url) });
}
