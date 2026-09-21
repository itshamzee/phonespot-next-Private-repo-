import { NextResponse } from "next/server";

/**
 * GET /api/feeds/google — gammel adresse på Google Merchant-feedet.
 *
 * Feedet ligger ét sted: /feeds/google-shopping. Denne rute byggede sit eget
 * XML med links som /tilbehoer/accessory/<slug> og /tilbehoer/spare-part/<slug>,
 * der ikke findes (404) — bliver den adresse hentet af Merchant Center, bliver
 * varerne afvist med "Landing page not working". Den sender nu videre til det
 * rigtige feed i stedet for at have to kilder, der kan komme ud af trit.
 */
export function GET() {
  return NextResponse.redirect("https://phonespot.dk/feeds/google-shopping", 308);
}
