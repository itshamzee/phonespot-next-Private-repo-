import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-shopify-webhook-hmac-sha256");

  if (secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const topic = request.headers.get("x-shopify-topic") ?? "";

    // Revalidate relevant pages based on Shopify webhook topic
    if (topic.startsWith("products/")) {
      revalidatePath("/", "layout");
      revalidatePath("/iphones");
      revalidatePath("/smartphones");
      revalidatePath("/ipads");
      revalidatePath("/smartwatches");
      revalidatePath("/baerbare");
    } else if (topic.startsWith("collections/")) {
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ revalidated: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
