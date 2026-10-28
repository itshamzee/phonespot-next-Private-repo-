import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";

/**
 * POST /api/admin/accessories/studio-photo — multipart `image` (det fritlagte PNG)
 * → professionelt produktfoto fra OpenAI (gpt-image-1), returneret som PNG.
 * Praktikanten ser det ved siden af den almindelige fritlagte version og vælger
 * selv, så et AI-billede, der har ændret varen, ikke kommer ud på siden.
 */
export const maxDuration = 60;

const PROMPT =
  "Professional e-commerce product photo of exactly this phone accessory. Keep the product identical: same shape, colour, print, logo, cut-outs and material. Do not add, remove or change anything on the product. Plain light warm grey background (#f5f5f2), soft natural shadow underneath, product centred and filling about 80% of the frame, straight-on front view, sharp focus, no text, no props, no hands.";

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI-billeder er ikke sat op" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof Blob) || image.size === 0 || image.size > 10_000_000) {
    return NextResponse.json({ error: "Billedet mangler" }, { status: 400 });
  }

  const body = new FormData();
  body.append("model", "gpt-image-1");
  body.append("image", image, "product.png");
  body.append("prompt", PROMPT);
  body.append("input_fidelity", "high");
  body.append("quality", "medium");
  body.append("size", "1024x1024");
  body.append("background", "opaque");

  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(55_000),
    });
    const data = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; error?: { message?: string } } | null;
    const b64 = data?.data?.[0]?.b64_json;
    if (!res.ok || !b64) {
      console.error("[studio-photo] OpenAI fejlede:", res.status, data?.error?.message);
      return NextResponse.json({ error: "AI-billedet kunne ikke laves" }, { status: 502 });
    }
    return new NextResponse(new Uint8Array(Buffer.from(b64, "base64")), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[studio-photo] fejl:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "AI-billedet kunne ikke laves" }, { status: 502 });
  }
}
