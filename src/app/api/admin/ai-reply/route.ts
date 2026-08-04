import { NextRequest, NextResponse } from "next/server";
import { STORES, COMPANY_EMAIL } from "@/lib/store-config";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const storeFacts = Object.values(STORES)
  .map((s) => `- ${s.name}: ${s.street}, ${s.zip} ${s.city} — Man-Fre ${s.hours.weekdays}, Lør-Søn ${s.hours.saturday}`)
  .join("\n");

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API-nøgle ikke konfigureret" }, { status: 500 });
  }

  const { customerName, customerMessage, subject, context } = await req.json();

  if (!customerMessage) {
    return NextResponse.json({ error: "Besked mangler" }, { status: 400 });
  }

  const systemPrompt = `Du er kundeservice-medarbejder hos PhoneSpot — en dansk butik i VestsjællandsCentret, Slagelse der sælger kvalitetstestet refurbished elektronik (iPhones, iPads, Samsung, MacBooks) og tilbyder professionel reparation af alle mærker.

Regler:
- Svar ALTID på dansk
- Vær venlig, professionel og hjælpsom
- Hold svaret kort og præcist (2-5 sætninger)
- Nævn relevante fakta: 36 måneders garanti, 14 dages returret, livstidsgaranti på reparationer, faste priser
- Hvis du ikke kan svare præcist, foreslå at kunden kontakter os på telefon eller besøger butikken
- Brug aldrig emojis
- Afslut med "Med venlig hilsen, PhoneSpot"
- Tilpas tonen til henvendelsens type

PhoneSpot info:
${storeFacts}
- Telefon: +45 61 10 00 48
- Email: ${COMPANY_EMAIL}
- Reparationer: skærmskift, batteriskift, vandskade, kamera, ladestik mm. — livstidsgaranti, faste priser, 90% klar på 30 min
- Sælg din enhed: vi opkøber brugte telefoner, tablets, laptops — tilbud inden 24 timer
- Refurbished: alle enheder testet med 30+ kontroller, Grade A/B/C system
- Betaling: Klarna delbetaling, Apple Pay, kort, MobilePay
- Vi sælger også tilbehør: covers, beskyttelsesglas, opladere, kabler`;

  const userPrompt = `Kunde: ${customerName || "Ukendt"}
Emne: ${subject || "Generel henvendelse"}
${context ? `Ekstra kontekst: ${context}` : ""}

Kundens besked:
"${customerMessage}"

Skriv et professionelt svar på dansk:`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: "AI-fejl. Prøv igen." }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: "Tomt svar fra AI" }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI reply error:", err);
    return NextResponse.json({ error: "Netværksfejl" }, { status: 500 });
  }
}
