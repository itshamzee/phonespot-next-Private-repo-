import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

/**
 * POST /api/admin/products/copywrite — skriver dansk webshop-tekst ud fra
 * leverandørens engelske produktdata. Returnerer kort titel, én linje til
 * grid/kort, 3–5 salgsargumenter og en beskrivelse, som personalet retter til
 * før produktet gemmes. Bag middleware (cookie-session).
 */
const inputSchema = z.object({
  title: z.string().min(3),
  brand: z.string().nullable().optional(),
  subcategory: z.string().optional(),
  models: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.string()).default({}),
  benefits: z.array(z.string()).default([]),
  description: z.string().default(""),
  /** Sæt hvis titlen skal indeholde {model} (ét produkt pr. model). */
  perModel: z.boolean().default(false),
});

const outputSchema = z.object({
  title: z.string().describe("Kort dansk produkttitel, højst 60 tegn. Mærke først. Ingen modelnavne; skriv {model} hvor modellen skal stå, hvis det er relevant."),
  shortDescription: z.string().describe("Én sætning på højst 110 tegn, som står under titlen i webshoppen. Konkret, ingen udråbstegn."),
  highlights: z.array(z.string()).min(3).max(5).describe("3–5 korte salgsargumenter på dansk, højst 60 tegn hver, uden punktum. Kun ting der står i kildedata."),
  description: z.string().describe("2–3 korte afsnit på dansk til produktsiden. Konkret og rolig tone, ingen superlativer, ingen påstande der ikke står i kildedata. Nævn hvad der følger med, hvis det er oplyst."),
});

const SYSTEM = `Du skriver produkttekster til PhoneSpot.dk, en dansk forhandler af refurbished Apple-produkter og tilbehør, med butikker i Vejle og Slagelse.
Tone: rolig, konkret og hjælpsom, som en dygtig ekspedient. Sentence case. Ingen emojis, ingen udråbstegn, ingen "fantastisk"/"perfekt"/"ultimativ".
Skriv aldrig ordet "Panserglas"; brug "beskyttelsesglas" eller "hærdet glas". Skriv aldrig "MagSafe-certificeret" medmindre kilden siger det; skriv "kompatibel med MagSafe", hvis MagSafe er nævnt.
Brug kun oplysninger fra kildedata. Oversæt materialer og egenskaber til naturligt dansk (fx "TPU" bliver ved med at hedde TPU, "wallet" bliver "pung", "detachable" bliver "aftagelig").
Titlen må ikke gentage modellen; skriv {model} som pladsholder, hvis perModel er sand, ellers uden pladsholder.`;

const labelBySlug = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d.label]));

export async function POST(req: NextRequest) {
  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige felter" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Tekstgenerering er ikke sat op (mangler API-nøgle)" }, { status: 503 });
  const input = parsed.data;

  const source = [
    `Leverandørtitel: ${input.title}`,
    input.brand ? `Mærke: ${input.brand}` : null,
    input.subcategory ? `Kategori: ${input.subcategory}` : null,
    input.models.length ? `Passer til: ${input.models.map((m) => labelBySlug.get(m) ?? m).join(", ")}` : null,
    Object.keys(input.specs).length ? `Specifikationer:\n${Object.entries(input.specs).map(([k, v]) => `- ${k}: ${v}`).join("\n")}` : null,
    input.benefits.length ? `Fordele (leverandør):\n${input.benefits.map((b) => `- ${b}`).join("\n")}` : null,
    input.description ? `Beskrivelse (leverandør):\n${input.description}` : null,
    `perModel: ${input.perModel}`,
  ].filter(Boolean).join("\n\n");

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      output_config: { effort: "medium", format: zodOutputFormat(outputSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Skriv dansk webshop-tekst ud fra disse kildedata:\n\n${source}` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "Teksten kunne ikke skrives. Prøv igen." }, { status: 502 });
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "For mange forespørgsler. Vent lidt og prøv igen." }, { status: 429 });
    if (err instanceof Anthropic.APIError) {
      if (/credit balance/i.test(err.message)) {
        return NextResponse.json({ error: "Anthropic-kontoen mangler kredit. Fyld op på console.anthropic.com under Plans & Billing, så virker dansk tekst igen." }, { status: 502 });
      }
      return NextResponse.json({ error: `Tekstgenerering fejlede (${err.status})` }, { status: 502 });
    }
    return NextResponse.json({ error: "Tekstgenerering fejlede" }, { status: 502 });
  }
}
