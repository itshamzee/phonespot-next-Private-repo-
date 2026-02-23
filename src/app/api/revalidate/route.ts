import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-medusa-webhook-secret");

  if (secret !== process.env.MEDUSA_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const event = body.event ?? "";

    // Revalidate relevant pages based on event type
    if (event.startsWith("product.")) {
      revalidatePath("/", "layout");
      revalidatePath("/iphones");
      revalidatePath("/smartphones");
      revalidatePath("/ipads");
      revalidatePath("/smartwatches");
      revalidatePath("/baerbare");
    } else if (event.startsWith("order.")) {
      // Orders don't need page revalidation typically
    }

    return NextResponse.json({ revalidated: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
