import type { Metadata } from "next";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "Privatlivspolitik - PhoneSpot",
  description:
    "Læs om hvordan PhoneSpot håndterer dine personlige data og beskytter dit privatliv i henhold til GDPR.",
};

export default function PrivatlivspolitikPage() {
  return (
    <SectionWrapper>
      <div
        className="mx-auto max-w-3xl space-y-8 leading-relaxed text-charcoal/80
          [&_a]:text-green-eco [&_a]:underline
          [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-charcoal
          [&_h3]:font-semibold [&_h3]:text-charcoal
          [&_li]:ml-4 [&_li]:list-disc
          [&_table]:w-full
          [&_td]:border [&_td]:border-charcoal/20 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
          [&_th]:border [&_th]:border-charcoal/20 [&_th]:bg-charcoal/5 [&_th]:px-3 [&_th]:py-2
          [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-charcoal"
      >
        <div>
          <Heading size="lg">Privatlivspolitik</Heading>
          <p className="mt-2 text-sm text-gray">Sidst opdateret: 12. marts 2026</p>
        </div>

        {/* 1. Dataansvarlig */}
        <div>
          <h2>1. Dataansvarlig</h2>
          <p className="mt-3">
            PhoneSpot ApS er dataansvarlig for behandlingen af de personoplysninger, som vi modtager
            om dig.
          </p>
          <div className="mt-3 space-y-1">
            <p>
              <strong>PhoneSpot ApS</strong>
            </p>
            <p>CVR-nr.: 38688766</p>
            <p>VestsjællandsCentret 10</p>
            <p>4200 Slagelse</p>
            <p>
              E-mail:{" "}
              <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>
            </p>
          </div>
          <p className="mt-3">
            Vi overholder gældende dansk og europæisk lovgivning om databeskyttelse (GDPR —
            Europa-Parlamentets og Rådets forordning (EU) 2016/679).
          </p>
        </div>

        {/* 2. Hvilke personoplysninger */}
        <div>
          <h2>2. Hvilke personoplysninger indsamler vi?</h2>
          <p className="mt-3">
            Afhængigt af din interaktion med PhoneSpot kan vi indsamle følgende kategorier af
            personoplysninger:
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <strong>Kontaktoplysninger:</strong> navn, e-mailadresse, telefonnummer og
              leveringsadresse
            </li>
            <li>
              <strong>Ordreoplysninger:</strong> de produkter du køber, ordrehistorik,
              betalingsstatus og faktureringsadresse
            </li>
            <li>
              <strong>Betalingsoplysninger:</strong> korttype og de sidste fire cifre (vi gemmer
              aldrig fulde kortoplysninger — det håndteres krypteret af Stripe)
            </li>
            <li>
              <strong>Brugsdata:</strong> IP-adresse, browsertype, enhedstype, sidevisninger og
              klikstrøm via cookies og analyseredskaber
            </li>
            <li>
              <strong>Kommunikation:</strong> indholdet af e-mails og supporthenvendelser du sender
              til os
            </li>
            <li>
              <strong>Markedsføringsdata:</strong> samtykke til nyhedsbreve og
              e-mailmarkedsføring (kun hvis du aktivt har tilmeldt dig)
            </li>
          </ul>
        </div>

        {/* 3. Formål og retsgrundlag */}
        <div>
          <h2>3. Formål og retsgrundlag</h2>
          <p className="mt-3">
            Vi behandler kun dine personoplysninger, når vi har et lovligt grundlag herfor. Nedenstående
            tabel viser de formål, vi behandler dine data til, og det tilhørende retsgrundlag i GDPR:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Formål</th>
                  <th>Retsgrundlag (GDPR)</th>
                  <th>Opbevaringsperiode</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ordrebehandling og levering</td>
                  <td>Art. 6(1)(b) — kontraktopfyldelse</td>
                  <td>5 år (bogføringsloven)</td>
                </tr>
                <tr>
                  <td>Kundeservice og support</td>
                  <td>Art. 6(1)(b) — kontraktopfyldelse</td>
                  <td>2 år efter sagens afslutning</td>
                </tr>
                <tr>
                  <td>Bogføring og regnskab</td>
                  <td>Art. 6(1)(c) — retlig forpligtelse</td>
                  <td>5 år (bogføringsloven § 10)</td>
                </tr>
                <tr>
                  <td>Nyhedsbreve og e-mailmarkedsføring</td>
                  <td>Art. 6(1)(a) — samtykke</td>
                  <td>Indtil samtykket trækkes tilbage</td>
                </tr>
                <tr>
                  <td>Anonym statistik og analyse</td>
                  <td>Art. 6(1)(f) — legitim interesse</td>
                  <td>26 måneder (Google Analytics)</td>
                </tr>
                <tr>
                  <td>Annoncering og remarketing</td>
                  <td>Art. 6(1)(a) — samtykke</td>
                  <td>Indtil samtykket trækkes tilbage</td>
                </tr>
                <tr>
                  <td>Svindelforebyggelse og sikkerhed</td>
                  <td>Art. 6(1)(f) — legitim interesse</td>
                  <td>1 år</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Modtagere */}
        <div>
          <h2>4. Modtagere og databehandlere</h2>
          <p className="mt-3">
            Vi deler dine personoplysninger med følgende kategorier af databehandlere, der alene
            behandler data på vores vegne og i overensstemmelse med vores instruktioner:
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Stripe, Inc.</strong> — betalingsbehandling. Dine kortoplysninger krypteres og
              håndteres udelukkende af Stripe.
            </li>
            <li>
              <strong>Supabase, Inc.</strong> — databasehosting og brugerautentificering.
            </li>
            <li>
              <strong>Resend, Inc.</strong> — transaktionelle e-mails (ordrebekræftelser,
              forsendelsesnotifikationer).
            </li>
            <li>
              <strong>Klaviyo, Inc.</strong> — e-mailmarkedsføring og nyhedsbreve (kun hvis du har
              givet samtykke).
            </li>
            <li>
              <strong>Shipmondo A/S</strong> — forsendelseshåndtering og generering af
              pakkelabels.
            </li>
            <li>
              <strong>Google LLC (Google Analytics)</strong> — anonym besøgsstatistik og
              trafikanalyse.
            </li>
            <li>
              <strong>Meta Platforms, Inc. / TikTok Ltd.</strong> — annoncemåling og remarketing
              (kun med dit samtykke via cookiesamtykke).
            </li>
            <li>
              <strong>Trustpilot A/S</strong> — indsamling og visning af kundeanmeldelser.
            </li>
            <li>
              <strong>Vercel, Inc.</strong> — hosting af vores hjemmeside og serverinfrastruktur.
            </li>
          </ul>
          <p className="mt-3">
            Vi sælger, udlejer eller videregiver aldrig dine personoplysninger til tredjeparter
            med henblik på deres egne markedsføringsformål.
          </p>
        </div>

        {/* 5. Overførsel til tredjelande */}
        <div>
          <h2>5. Overførsel til tredjelande</h2>
          <p className="mt-3">
            Nogle af vores databehandlere er etableret uden for EU/EØS, herunder i USA. Overførsler
            til disse lande sker på grundlag af:
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              EU-Kommissionens standardkontraktbestemmelser (SCC&apos;er), eller
            </li>
            <li>
              en EU-adækvansbeslutning, eksempelvis EU-U.S. Data Privacy Framework, hvor
              leverandøren er certificeret.
            </li>
          </ul>
          <p className="mt-3">
            Du kan anmode om en kopi af de relevante overførselsgarantier ved at skrive til{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
        </div>

        {/* 6. Dine rettigheder */}
        <div>
          <h2>6. Dine rettigheder</h2>
          <p className="mt-3">
            Du har følgende rettigheder i henhold til GDPR. Du kan til enhver tid gøre brug af dem
            ved at kontakte os på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>. Vi besvarer din henvendelse
            hurtigst muligt og senest inden for 30 dage.
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Ret til indsigt (art. 15):</strong> Du har ret til at få bekræftet, om vi
              behandler dine personoplysninger, og i givet fald at få en kopi heraf.
            </li>
            <li>
              <strong>Ret til berigtigelse (art. 16):</strong> Du har ret til at få urigtige
              personoplysninger om dig rettet uden unødig forsinkelse.
            </li>
            <li>
              <strong>Ret til sletning (art. 17):</strong> Du har i visse tilfælde ret til at få
              dine personoplysninger slettet ("retten til at blive glemt").
            </li>
            <li>
              <strong>Ret til begrænsning af behandling (art. 18):</strong> Du har i visse
              tilfælde ret til at få behandlingen af dine personoplysninger begrænset.
            </li>
            <li>
              <strong>Ret til dataportabilitet (art. 20):</strong> Du har ret til at modtage dine
              personoplysninger i et struktureret, almindeligt anvendt og maskinlæsbart format.
            </li>
            <li>
              <strong>Ret til indsigelse (art. 21):</strong> Du har ret til at gøre indsigelse mod
              behandling af dine personoplysninger, der er baseret på legitim interesse, herunder
              profilering.
            </li>
            <li>
              <strong>Ret til at trække samtykke tilbage (art. 7):</strong> Hvis behandlingen er
              baseret på dit samtykke, kan du til enhver tid trække det tilbage. Tilbagetrækning
              påvirker ikke lovligheden af behandling foretaget inden tilbagetrækningen.
            </li>
          </ul>
        </div>

        {/* 7. Klageadgang */}
        <div>
          <h2>7. Klageadgang</h2>
          <p className="mt-3">
            Hvis du mener, at vi behandler dine personoplysninger i strid med gældende
            databeskyttelseslovgivning, opfordrer vi dig til først at kontakte os, så vi kan forsøge
            at løse problemet.
          </p>
          <p className="mt-3">
            Du har dog altid ret til at indgive en klage til Datatilsynet:
          </p>
          <div className="mt-3 space-y-1">
            <p>
              <strong>Datatilsynet</strong>
            </p>
            <p>Carl Jacobsens Vej 35</p>
            <p>2500 Valby</p>
            <p>
              Telefon: +45 33 19 32 00
            </p>
            <p>
              E-mail:{" "}
              <a href="mailto:dt@datatilsynet.dk">dt@datatilsynet.dk</a>
            </p>
            <p>
              Hjemmeside:{" "}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer">
                www.datatilsynet.dk
              </a>
            </p>
          </div>
        </div>

        {/* 8. Cookies */}
        <div>
          <h2>8. Cookies</h2>
          <p className="mt-3">
            Vi anvender cookies og lignende teknologier på vores hjemmeside. Cookies er små
            tekstfiler, der gemmes på din enhed, når du besøger hjemmesiden.
          </p>
          <p className="mt-3">Vi anvender følgende kategorier af cookies:</p>
          <ul className="mt-3 space-y-2">
            <li>
              <strong>Nødvendige cookies:</strong> Disse er nødvendige for, at hjemmesiden fungerer
              korrekt (f.eks. kurv, session og sikkerhed). De kan ikke fravælges.
            </li>
            <li>
              <strong>Statistik-cookies:</strong> Vi anvender Google Analytics til at forstå, hvordan
              besøgende bruger vores hjemmeside. Data anonymiseres inden behandling.
            </li>
            <li>
              <strong>Markedsføringscookies:</strong> Med dit samtykke anvender vi cookies fra Meta
              (Facebook/Instagram) og TikTok til annoncemåling og remarketing.
            </li>
          </ul>
          <p className="mt-3">
            Du kan til enhver tid ændre eller trække dit cookiesamtykke tilbage via vores
            cookiebanner. Du kan også administrere cookies i din browsers indstillinger.
          </p>
        </div>

        {/* 9. Sikkerhed */}
        <div>
          <h2>9. Sikkerhed</h2>
          <p className="mt-3">
            Vi træffer passende tekniske og organisatoriske sikkerhedsforanstaltninger for at
            beskytte dine personoplysninger mod uautoriseret adgang, ændring, videregivelse eller
            sletning. Dette inkluderer bl.a.:
          </p>
          <ul className="mt-3 space-y-1">
            <li>Krypteret dataoverførsel via HTTPS (TLS)</li>
            <li>Krypteret opbevaring af følsomme data i databasen</li>
            <li>Adgangskontrol og rollebaserede rettigheder</li>
            <li>Regelmæssig gennemgang af adgange og databehandlere</li>
          </ul>
          <p className="mt-3">
            Bemærk, at ingen metode til transmission over internet eller elektronisk lagring er 100 %
            sikker. Hvis du har mistanke om et sikkerhedsbrud, bedes du straks kontakte os på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
        </div>

        {/* 10. Ændringer */}
        <div>
          <h2>10. Ændringer til denne privatlivspolitik</h2>
          <p className="mt-3">
            Vi forbeholder os ret til at opdatere denne privatlivspolitik, efterhånden som vores
            tjenester og lovgivningen udvikler sig. Den seneste version vil altid være tilgængelig
            på denne side med datoen for seneste opdatering øverst.
          </p>
          <p className="mt-3">
            Ved væsentlige ændringer vil vi informere dig via e-mail (hvis du er registreret kunde
            eller nyhedsbrevstilmeldt) eller via et synligt banner på hjemmesiden.
          </p>
          <p className="mt-3">
            Har du spørgsmål til denne privatlivspolitik, er du altid velkommen til at kontakte os
            på <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
