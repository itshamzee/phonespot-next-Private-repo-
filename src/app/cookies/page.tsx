import type { Metadata } from "next";
import Script from "next/script";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "Cookiepolitik - PhoneSpot",
  description:
    "Læs om PhoneSpots brug af cookies, hvilke kategorier vi anvender, og hvordan du administrerer dit samtykke.",
};

export default function CookiesPage() {
  const cbid = process.env.NEXT_PUBLIC_COOKIEBOT_CBID;

  return (
    <main>
      <SectionWrapper className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-10">

          {/* Title */}
          <div>
            <Heading as="h1" size="xl">
              Cookiepolitik
            </Heading>
            <p className="text-sm text-muted-foreground mt-1">
              Sidst opdateret: 13. marts 2026
            </p>
          </div>

          {/* Hvad er cookies? */}
          <section>
            <Heading as="h2" size="lg" className="mb-3">
              Hvad er cookies?
            </Heading>
            <p className="text-muted-foreground leading-relaxed">
              Cookies er små tekstfiler, der gemmes på din enhed (computer, tablet eller
              telefon), når du besøger en hjemmeside. Cookies hjælper os med at forbedre
              din oplevelse på phonespot.dk ved at huske dine præferencer, holde dig
              logget ind og forstå, hvordan du bruger vores side. Cookies indeholder
              ingen personoplysninger i sig selv og kan ikke køre programmer eller
              overføre virus.
            </p>
          </section>

          {/* Cookiekategorier */}
          <section>
            <Heading as="h2" size="lg" className="mb-4">
              Cookiekategorier
            </Heading>
            <div className="space-y-6">

              {/* Nødvendige */}
              <div>
                <Heading as="h3" size="sm" className="mb-2">
                  Nødvendige cookies
                </Heading>
                <p className="text-muted-foreground leading-relaxed">
                  Nødvendige cookies er uundværlige for, at hjemmesiden kan fungere
                  korrekt. De bruges til funktioner som indkøbskurv, brugersession,
                  sikkerhedstokens og grundlæggende navigation. Disse cookies kræver
                  ikke dit samtykke og kan ikke deaktiveres, da siden ikke vil fungere
                  uden dem. De gemmer ingen personhenførbare oplysninger.
                </p>
              </div>

              {/* Statistik */}
              <div>
                <Heading as="h3" size="sm" className="mb-2">
                  Statistik (analytiske cookies)
                </Heading>
                <p className="text-muted-foreground leading-relaxed">
                  Statistik-cookies hjælper os med at forstå, hvordan besøgende bruger
                  vores hjemmeside. De indsamler anonymiserede data om sidevisninger,
                  sessionsvarighed og navigeringsmønstre — eksempelvis via Google
                  Analytics 4. Disse oplysninger bruger vi udelukkende til at forbedre
                  hjemmesidens indhold og brugeroplevelse og deles ikke med tredjepart
                  til kommercielle formål. De sættes kun med dit samtykke.
                </p>
              </div>

              {/* Marketing */}
              <div>
                <Heading as="h3" size="sm" className="mb-2">
                  Marketing cookies
                </Heading>
                <p className="text-muted-foreground leading-relaxed">
                  Marketing-cookies bruges til at vise dig relevante annoncer og måle
                  effekten af vores markedsføringskampagner. De kan sættes af
                  tredjepart som Meta (Facebook/Instagram), TikTok og Google og bruges
                  til at målrette annoncer på tværs af hjemmesider og platforme. Disse
                  cookies sættes kun med dit eksplicitte samtykke.
                </p>
              </div>

              {/* Funktionelle */}
              <div>
                <Heading as="h3" size="sm" className="mb-2">
                  Funktionelle cookies
                </Heading>
                <p className="text-muted-foreground leading-relaxed">
                  Funktionelle cookies husker dine valg og præferencer — f.eks.
                  sprogindstillinger, visning af produkter eller nyhedsbrevstilmelding
                  via Klaviyo — så vi kan give dig en mere personlig oplevelse. De
                  sættes kun med dit samtykke og er ikke nødvendige for sidens
                  grundlæggende drift.
                </p>
              </div>

            </div>
          </section>

          {/* Sådan administrerer du cookies */}
          <section>
            <Heading as="h2" size="lg" className="mb-3">
              Sådan administrerer du cookies
            </Heading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Du kan til enhver tid ændre eller trække dit samtykke tilbage ved at klikke
              på cookie-ikonet i bunden af siden. Du kan også slette eller blokere cookies
              via din browsers indstillinger — i de fleste browsere finder du muligheden
              under <em>Privatliv</em> eller <em>Sikkerhed</em>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Bemærk at blokering af nødvendige cookies kan påvirke hjemmesidens
              funktionalitet, herunder indkøbskurven og betalingsflow. Blokering af
              marketing-cookies vil ikke fjerne reklamer, men de vil blot ikke være
              tilpasset dine interesser.
            </p>
          </section>

          {/* Komplet cookieoversigt (Cookiebot auto-declaration) */}
          <section>
            <Heading as="h2" size="lg" className="mb-4">
              Komplet cookieoversigt
            </Heading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nedenstående oversigt er automatisk genereret og vedligeholdt af Cookiebot
              og indeholder en komplet liste over alle cookies, der anvendes på
              phonespot.dk.
            </p>
            {cbid ? (
              <div id="CookiebotDeclaration">
                <Script
                  id="CookieDeclaration"
                  src={`https://consent.cookiebot.com/${cbid}/cd.js`}
                  strategy="afterInteractive"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Cookieoversigt er ikke tilgængelig i dette miljø (
                <code>NEXT_PUBLIC_COOKIEBOT_CBID</code> er ikke sat).
              </p>
            )}
          </section>

          {/* Kontakt */}
          <section>
            <Heading as="h2" size="lg" className="mb-3">
              Kontakt
            </Heading>
            <p className="text-muted-foreground leading-relaxed">
              Har du spørgsmål til vores brug af cookies eller denne politik, er du
              velkommen til at kontakte os:
            </p>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>
                <strong>E-mail:</strong>{" "}
                <a href="mailto:kontakt@phonespot.dk" className="underline hover:text-foreground">
                  kontakt@phonespot.dk
                </a>
              </li>
              <li>
                <strong>Telefon:</strong> +45 71 74 38 74
              </li>
              <li>
                <strong>Adresse:</strong> PhoneSpot ApS, Søndergade 4, 8600 Silkeborg
              </li>
            </ul>
          </section>

        </div>
      </SectionWrapper>
    </main>
  );
}
