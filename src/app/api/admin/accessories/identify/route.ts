import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { findCandidates } from "@/lib/accessory-intake/candidates";
import { suggestPriceKr } from "@/lib/accessory-intake/pricing";
import { sanitizeIdentified } from "@/lib/accessory-intake/sanitize";
import { matchModelText } from "@/lib/accessory-intake/model-text";
import type { Identified, MatchCandidate } from "@/lib/accessory-intake/types";

/**
 * POST /api/admin/accessories/identify — hurtig tilbehørsoptagelse.
 * Claude læser et foto af pakken eller varen (varetype, mærke, model(ler), farve,
 * dansk titel og tekst, trykte varekoder). Derefter eksakt kodematch og op til 3
 * mulige dubletter. Fejler AI'en, svarer ruten 200 med aiError, så flowet kan
 * fortsætte manuelt.
 */
export const maxDuration = 30;

const bodySchema = z.object({
  image: z.string().min(1).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});

const outputSchema = z.object({
  productType: z
    .enum(["cover", "flip_cover", "screen_protector", "other"])
    .describe("cover = bagcovers og bumpers; flip_cover = flip-, bog- og pungcovers; screen_protector = beskyttelsesglas og skærmfilm; other = alt andet (urremme, kabler, holdere)"),
  brand: z.string().nullable().describe("Mærket trykt på pakken eller varen, fx Apple, Samsung, NovaNL, Rixus, Celly, Swissten. null hvis intet mærke kan ses."),
  isGenuineBrandProduct: z.boolean().describe("true kun hvis varen er telefonproducentens eget produkt (fx Apple Silicone Case, Samsung Silicone Cover)."),
  models: z.array(z.string()).describe("Slugs fra modellisten, som varen passer til. Flere hvis pakken nævner flere (fx 12/12 Pro). Tom hvis usikker."),
  unknownModelText: z.string().nullable().describe("Modelnavnet som det står, hvis det ikke findes i modellisten."),
  modelConfidence: z.enum(["high", "medium", "low"]).describe("high = modellen står trykt; medium = tydeligt ud fra form og kamerahul; low = gæt."),
  caseType: z
    .enum(["Clear", "Slim", "Rugged", "Wallet", "Flip", "Bumper"])
    .nullable()
    .describe("Clear = gennemsigtig; Slim = silikone eller tyndt; Rugged = stødsikkert; Wallet = pung; Flip = flip eller bog; Bumper. null for glas og andet."),
  color: z.string().nullable().describe("Farve på dansk med stort forbogstav, fx Sort, Hvid, Grøn, Lyserød, Gennemsigtig."),
  features: z.array(z.string()).describe("Egenskaber der er TRYKT på pakken eller tydeligt synlige, på dansk. Intet gættet."),
  titleDa: z.string().describe("Dansk titel, højst 70 tegn."),
  descriptionDa: z.string().describe("2-3 korte sætninger på dansk til produktsiden. Kun fakta fra fotoet."),
  supplierCodes: z.array(z.string()).describe("Varenumre eller EAN trykt på pakken, fx RIX02646 eller 5701234567890. Tom hvis ingen."),
  readText: z.string().describe("Den vigtigste tekst du kunne læse på pakken, højst 300 tegn."),
});

const MODEL_LIST = TILBEHOER_DEVICES.map((d) => `${d.slug}: ${d.label}`).join("\n");
const VALID_SLUGS = new Set(TILBEHOER_DEVICES.map((d) => d.slug));

const SYSTEM = `Du hjælper PhoneSpot.dk (dansk forhandler af refurbished elektronik og tilbehør, butikker i Vejle og Slagelse) med at oprette tilbehør fra lageret. Du får et foto af en pakke eller et løst cover eller glas.

Regler:
- Skriv KUN det, der står trykt på pakken eller tydeligt kan ses. Find aldrig på egenskaber (MagSafe, stødsikring, militærstandard, materialer), der ikke står der.
- Returnér aldrig priser. Ignorér prismærker.
- Titelformat: "{Mærke} {type} til {model(ler)}, {farve}". "Apple" eller "Samsung" må kun stå først, hvis varen er producentens eget produkt; ellers fx "Silikonecover til iPhone 13, sort". Ukendt mærke: udelad mærket. Gentag ikke farven, hvis typen allerede siger den (gennemsigtigt cover).
- Skriv aldrig "Panserglas"; brug "beskyttelsesglas" eller "hærdet glas".
- Tilbehør har 2 års reklamationsret. Skriv aldrig om garanti i måneder.
- Ingen emojis, ingen udråbstegn, ingen superlativer. Rolig, konkret dansk.
- Skriv aldrig "original emballage" eller "original kasse".
- Kort modeltekst som A32, A52s, S20, S21 FE, Note 10 betyder Samsung Galaxy. "5G", "4G" og "LTE" ignoreres, når slug vælges (Galaxy A32 5G = samsung-a32).
- Modeller vælges som slugs fra listen herunder. Står der "iPhone 12/12 Pro", vælg begge. Står modellen ikke på listen, lad models være tom og skriv navnet i unknownModelText.

Modelliste (slug: navn):
${MODEL_LIST}`;

const fallback = (aiError: string) =>
  NextResponse.json({ identified: null, exact: null, candidates: [], priceKr: 59, aiError });

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Billedet mangler" }, { status: 400 });
  const { image, mediaType } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) return fallback("AI er ikke sat op");

  let identified: Identified;
  try {
    const client = new Anthropic();
    const response = await client.messages.parse(
      {
        model: "claude-haiku-5-5",
        max_tokens: 1500,
        output_config: { format: zodOutputFormat(outputSchema) },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: "Aflæs varen på fotoet." },
            ],
          },
        ],
      },
      { signal: AbortSignal.timeout(20_000) },
    );
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("Intet svar");
    identified = sanitizeIdentified(response.parsed_output as Identified, VALID_SLUGS);
    // AI'en læste modellen, men fandt ikke slug'en (fx "A32 5G"): slå teksten op selv.
    if (identified.models.length === 0 && identified.unknownModelText) {
      const models = matchModelText(identified.unknownModelText);
      if (models.length) identified = { ...identified, models, modelConfidence: "medium", unknownModelText: null };
    }
  } catch (err) {
    console.error("[identify] AI fejlede:", err instanceof Error ? err.message : err);
    return fallback("AI kunne ikke læse billedet. Udfyld selv.");
  }

  let exact: MatchCandidate | null = null;
  let candidates: MatchCandidate[] = [];
  try {
    ({ exact, candidates } = await findCandidates(createAdminClient(), identified));
  } catch (err) {
    console.error("[identify] dubletsøgning fejlede:", err);
  }

  return NextResponse.json({ identified, exact, candidates, priceKr: suggestPriceKr(identified) });
}
