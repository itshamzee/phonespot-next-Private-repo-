import { NextResponse } from "next/server";
import { GOOGLE_REVIEW_URLS } from "@/lib/store-config";

/** /anmeld/<butik> → butikkens Google-anmeldelseslink (bruges i SMS, se smsReviewUrl). */
export async function GET(_req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  const url = GOOGLE_REVIEW_URLS[store]?.trim();
  return NextResponse.redirect(url || "https://phonespot.dk/", 302);
}
