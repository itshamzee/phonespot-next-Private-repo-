import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/cart/capture-email
//
// Saves an email address + cart snapshot to the `cart_captures` table so the
// recovery cron job can send an abandoned-cart email to guests who never
// proceeded to checkout.
//
// Body:
//   {
//     email: string,
//     items: Array<{
//       type: "device" | "sku_product",
//       deviceId?: string,
//       skuProductId?: string,
//       title: string,
//       price: number,   // øre
//       quantity?: number,
//       image?: string | null,
//     }>
//   }
// ---------------------------------------------------------------------------

interface CaptureItem {
  type: "device" | "sku_product";
  deviceId?: string;
  skuProductId?: string;
  title: string;
  price: number;
  quantity?: number;
  image?: string | null;
}

interface RequestBody {
  email: string;
  items: CaptureItem[];
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const items = body.items ?? [];

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ugyldig e-mailadresse" }, { status: 422 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Ingen varer i kurven" }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Upsert: if the same email captures again, update the items and timestamp.
  const { error: dbError } = await supabase.from("cart_captures").upsert(
    {
      email,
      items: items as unknown as Record<string, unknown>[],
      captured_at: new Date().toISOString(),
      recovery_sent: false,
    },
    { onConflict: "email" },
  );

  if (dbError) {
    console.error("[cart/capture-email] DB error:", dbError);
    // If the table does not exist yet, return a soft error without alarming the user.
    return NextResponse.json({ error: "Kunne ikke gemme" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
