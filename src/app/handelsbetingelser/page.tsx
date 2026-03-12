import type { Metadata } from "next";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "Handelsbetingelser - PhoneSpot",
  description:
    "Læs PhoneSpots handelsbetingelser for køb af refurbished iPhones, iPads og øvrig elektronik — version 2.0.",
};

export default function HandelsbetingelserPage() {
  return (
    <SectionWrapper>
      <div
        className="mx-auto max-w-3xl space-y-8 leading-relaxed text-charcoal/80
          [&_a]:text-green-eco [&_a]:underline
          [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-charcoal
          [&_h3]:font-semibold [&_h3]:text-charcoal
          [&_li]:ml-4 [&_li]:list-disc"
      >
        <div>
          <Heading size="lg">Handelsbetingelser</Heading>
          <p className="mt-2 text-sm text-gray">
            Version 2.0 — Sidst opdateret: 12. marts 2026
          </p>
        </div>

        {/* 1. Virksomhedsoplysninger */}
        <div>
          <h2>1. Virksomhedsoplysninger</h2>
          <p className="mt-3">
            Disse handelsbetingelser er udstedt af:
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
            <p>
              Hjemmeside:{" "}
              <a href="https://www.phonespot.dk" target="_blank" rel="noopener noreferrer">
                www.phonespot.dk
              </a>
            </p>
          </div>
        </div>

        {/* 2. Anvendelsesområde */}
        <div>
          <h2>2. Anvendelsesområde</h2>
          <p className="mt-3">
            Disse handelsbetingelser gælder for alle køb foretaget hos PhoneSpot ApS — både via
            vores webshop på phonespot.dk og i vores fysiske butik. Ved at gennemføre et køb
            accepterer du disse betingelser i sin helhed.
          </p>
          <p className="mt-3">
            Betingelserne gælder for køb foretaget af forbrugere (privatpersoner) samt
            erhvervskunder. Bemærk at visse rettigheder, herunder fortrydelsesretten, alene
            gælder for forbrugere og ikke for erhvervskunder, medmindre andet er aftalt
            skriftligt.
          </p>
          <p className="mt-3">
            PhoneSpot forbeholder sig ret til at opdatere disse betingelser. Den til enhver tid
            gældende version er tilgængelig på phonespot.dk/handelsbetingelser. Ændringer
            påvirker ikke køb, der allerede er bekræftet.
          </p>
        </div>

        {/* 3. Produkter og kvalitetsgradering */}
        <div>
          <h2>3. Produkter og kvalitetsgradering</h2>
          <p className="mt-3">
            PhoneSpot sælger professionelt renoveret (refurbished) elektronik. Alle produkter
            gennemgår en grundig funktionstest og rengøring inden salg. Vi anvender følgende
            kvalitetsgraderingsystem:
          </p>
          <ul className="mt-3 space-y-3">
            <li>
              <strong>Grad A — Som ny:</strong> Enheden fremstår i næsten ny stand med ingen
              eller meget lette brugsspor, som kun ses under direkte lys. Fuld funktionalitet.
              Batterisundhed minimum 85 %.
            </li>
            <li>
              <strong>Grad B — God stand:</strong> Enheden har synlige, men begrænsede ridser
              eller mærker fra normal brug. Fuld funktionalitet. Batterisundhed minimum 80 %.
            </li>
            <li>
              <strong>Grad C — Acceptabel stand:</strong> Enheden har tydelige brugsspor i form
              af ridser, mærker eller mindre kosmetiske skader, men er fuldt funktionsdygtig.
              Batterisundhed minimum 75 %.
            </li>
          </ul>
          <p className="mt-3">
            Graderingen fremgår tydeligt af det enkelte produkt på hjemmesiden. Produktbeskrivelsen
            kan desuden indeholde specifikke oplysninger om kendte kosmetiske afvigelser.
          </p>
        </div>

        {/* 4. Priser */}
        <div>
          <h2>4. Priser</h2>
          <p className="mt-3">
            Alle priser er angivet i danske kroner (DKK) inkl. 25 % moms. PhoneSpot handler
            under brugtmomsordningen (momslovens §§ 69–71), hvilket betyder, at moms beregnes
            af avancen og ikke af den fulde salgspris. Som følge heraf fremgår momsbeløbet ikke
            separat på fakturaen, og erhvervskunder kan ikke fratrække moms af købet.
          </p>
          <p className="mt-3">
            Priser kan ændres uden forudgående varsel, men ændringer påvirker ikke ordrer, der
            allerede er bekræftet. Vi tager forbehold for trykfejl i priser og produktbeskrivelser.
          </p>
          <p className="mt-3">
            Eventuelle leveringsomkostninger oplyses tydeligt i kurven og ved checkout, inden du
            gennemfører købet.
          </p>
        </div>

        {/* 5. Bestilling og betaling */}
        <div>
          <h2>5. Bestilling og betaling</h2>
          <p className="mt-3">
            Bestillingsprocessen på phonespot.dk forløber i følgende trin:
          </p>
          <ol className="mt-3 space-y-1 [&_li]:list-decimal">
            <li>Læg produktet i kurven og gå til checkout.</li>
            <li>Udfyld dine kontakt- og leveringsoplysninger.</li>
            <li>Vælg leveringsmetode.</li>
            <li>Gennemfør betaling via en af vores betalingsmetoder.</li>
            <li>
              Modtag ordrebekræftelse på e-mail — aftalen er bindende fra dette tidspunkt.
            </li>
          </ol>
          <p className="mt-3">
            Vi accepterer følgende betalingsmetoder: Visa, Mastercard, Dankort og MobilePay.
            Alle betalinger behandles sikkert via Stripe, Inc. og er krypteret med TLS. Vi
            gemmer aldrig dine fulde kortoplysninger.
          </p>
          <p className="mt-3">
            Beløbet reserveres på dit kort ved bestilling og trækkes, når ordren afsendes.
          </p>
        </div>

        {/* 6. Levering */}
        <div>
          <h2>6. Levering</h2>
          <p className="mt-3">
            Vi afsender din ordre inden for 1–3 hverdage efter bekræftet betaling. Du modtager
            en afsendelsesbekræftelse med Track &amp; Trace-nummer, så du kan følge pakken.
          </p>
          <p className="mt-3">Vi tilbyder følgende leveringsformer:</p>
          <ul className="mt-3 space-y-1">
            <li>Levering til pakkeshop (GLS, PostNord eller DAO)</li>
            <li>Hjemmelevering</li>
            <li>Click &amp; Collect — afhentning i vores butik i VestsjællandsCentret, Slagelse</li>
          </ul>
          <p className="mt-3">
            Fragtpriserne fremgår ved checkout. Levering er gratis ved ordrer over 499 kr.
            Risikoen for varens hændelige undergang overgår til dig som køber, når forsendelsen
            er afleveret til transportøren.
          </p>
          <p className="mt-3">
            Hvis din pakke er synligt beskadiget ved modtagelse, bedes du afvise forsendelsen
            eller straks notere skaden hos transportøren og kontakte os på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
        </div>

        {/* 7. Fortrydelsesret */}
        <div>
          <h2>7. Fortrydelsesret (14 dage)</h2>
          <p className="mt-3">
            Som forbruger har du 14 dages fortrydelsesret i henhold til forbrugeraftalelovens
            kapitel 4. Fortrydelsesfristen løber fra den dag, du modtager varen.
          </p>
          <p className="mt-3">
            For at gøre brug af fortrydelsesretten skal du inden fristens udløb give os en
            utvetydig meddelelse herom — f.eks. ved at udfylde standardfortrydelsesformularen
            nedenfor eller ved at sende en e-mail til{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
          <p className="mt-3">
            Du skal returnere varen uden unødig forsinkelse og senest 14 dage efter, at du har
            meddelt os, at du fortryder købet. Returforsendelsen sker for din regning og risiko.
          </p>
          <p className="mt-3">
            Vi refunderer det fulde beløb inklusive eventuelle standardleveringsomkostninger
            (dog ikke ekstra leveringsomkostninger ved valg af anden end den billigste
            standardlevering) senest 14 dage efter, at vi har modtaget din fortrydelsesmeddelelse
            — forudsat at vi har modtaget varen retur, eller du har dokumenteret at have
            returneret den.
          </p>
          <p className="mt-3">
            Varen skal returneres i den stand, hvori du modtog den. Du hæfter for en eventuel
            værdiforringelse af varen, som skyldes anden håndtering end det, der er nødvendigt
            for at fastslå varens art, egenskaber og den måde, den fungerer på.
          </p>
          <p className="mt-3">
            <strong>Fortrydelsesretten gælder ikke for erhvervskunder</strong>, medmindre andet
            er aftalt skriftligt.
          </p>
        </div>

        {/* 8. Standardfortrydelsesformular */}
        <div>
          <h2>8. Standardfortrydelsesformular</h2>
          <p className="mt-3">
            Udfyld og returner denne formular, hvis du ønsker at fortryde dit køb:
          </p>
          <div className="mt-4 rounded-lg border border-charcoal/20 bg-charcoal/5 p-5 space-y-3 text-sm">
            <p>
              <strong>Til:</strong> PhoneSpot ApS, VestsjællandsCentret 10, 4200 Slagelse
              <br />
              E-mail:{" "}
              <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>
            </p>
            <p>
              Jeg/vi (*) meddeler herved, at jeg/vi (*) ønsker at gøre fortrydelsesretten
              gældende i forbindelse med min/vores (*) købeaftale om følgende varer (*) /
              levering af følgende tjenesteydelser (*):
            </p>
            <p>______________________________________</p>
            <p>Bestilt den (*) / modtaget den (*):</p>
            <p>______________________________________</p>
            <p>Forbrugerens navn:</p>
            <p>______________________________________</p>
            <p>Forbrugerens adresse:</p>
            <p>______________________________________</p>
            <p>Forbrugerens underskrift (kun hvis formularens indhold meddeles på papir):</p>
            <p>______________________________________</p>
            <p>Dato:</p>
            <p>______________________________________</p>
            <p className="text-xs text-charcoal/50">(*) Det ikke relevante overstreges.</p>
          </div>
        </div>

        {/* 9. Reklamationsret */}
        <div>
          <h2>9. Reklamationsret (24 måneder)</h2>
          <p className="mt-3">
            Du har 24 måneders reklamationsret i henhold til købeloven. Reklamationsretten
            dækker fejl og mangler, der forelå på leveringstidspunktet.
          </p>
          <p className="mt-3">
            I de første 12 måneder efter levering formodes det, at en konstateret fejl forelå
            ved levering, medmindre PhoneSpot kan godtgøre det modsatte. Efter 12 måneder er
            det dig som køber, der skal godtgøre, at fejlen forelå på leveringstidspunktet.
          </p>
          <p className="mt-3">
            Reklamationsretten dækker ikke fejl eller skader, der skyldes forkert brug, uheld,
            fysisk beskadigelse, vandskade, uautoriserede reparationer eller normal slitage.
          </p>
          <p className="mt-3">
            For at gøre en reklamation gældende bedes du kontakte os hurtigst muligt og senest
            inden for rimelig tid efter, at du har opdaget fejlen. Kontakt os på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a> med en beskrivelse af
            fejlen og dit ordrenummer. Afhængigt af fejlens art vil vi tilbyde reparation,
            ombytning eller refundering.
          </p>
        </div>

        {/* 10. PhoneSpot Garanti */}
        <div>
          <h2>10. PhoneSpot Garanti (36 måneder)</h2>
          <p className="mt-3">
            Ud over den lovpligtige reklamationsret tilbyder PhoneSpot en udvidet garanti på
            36 måneder på alle refurbished produkter. Garantien er en frivillig garanti fra
            PhoneSpot og begrænser ikke dine rettigheder efter købeloven.
          </p>
          <h3 className="mt-4">Garantien dækker</h3>
          <ul className="mt-2 space-y-1">
            <li>Fabrikationsfejl og funktionelle mangler, der ikke skyldes brugerens adfærd</li>
            <li>Pludselig funktionssvigt ved normal brug</li>
            <li>Batterisundhed under garanteret minimumsniveau (jf. produktbeskrivelsen)</li>
          </ul>
          <h3 className="mt-4">Garantien dækker ikke</h3>
          <ul className="mt-2 space-y-1">
            <li>Skader som følge af fald, stød eller slag</li>
            <li>Vandskade eller fugtighedsskade</li>
            <li>Skader fra forkert brug eller uautoriserede reparationer</li>
            <li>Normal slitage (ridser, misfarvning af kabinet mv.)</li>
            <li>Skader opstået ved strømstød</li>
          </ul>
          <p className="mt-4">
            Garantien dokumenteres ved et garantibevis, der udstedes ved købet og vedlægges
            ordrebekræftelsen. For at gøre garantien gældende skal du kontakte os på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a> med garantibeviset og en
            fejlbeskrivelse.
          </p>
        </div>

        {/* 11. Klager */}
        <div>
          <h2>11. Klager</h2>
          <p className="mt-3">
            Hvis du ønsker at klage over et køb, bedes du i første omgang kontakte vores
            kundeservice på{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>, så vi kan forsøge at
            finde en løsning.
          </p>
          <p className="mt-3">
            Kan vi ikke løse problemet i mindelighed, kan du som forbruger indgive en klage til:
          </p>
          <div className="mt-3 space-y-1">
            <p>
              <strong>Nævnenes Hus</strong>
            </p>
            <p>Toldboden 2</p>
            <p>8800 Viborg</p>
            <p>
              Hjemmeside:{" "}
              <a href="https://www.naevneneshus.dk" target="_blank" rel="noopener noreferrer">
                www.naevneneshus.dk
              </a>
            </p>
          </div>
          <p className="mt-3">
            Hvis du er bosiddende i et andet EU-land, kan du klage via EU-Kommissionens
            online klageplatform (ODR-platformen):{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Vores e-mailadresse til brug for ODR-klager er{" "}
            <a href="mailto:info@phonespot.dk">info@phonespot.dk</a>.
          </p>
        </div>

        {/* 12. Persondata */}
        <div>
          <h2>12. Persondata</h2>
          <p className="mt-3">
            PhoneSpot behandler dine personoplysninger i overensstemmelse med gældende
            databeskyttelseslovgivning (GDPR). Du kan læse mere om, hvordan vi indsamler,
            anvender og beskytter dine personoplysninger i vores{" "}
            <a href="/privatlivspolitik">privatlivspolitik</a>.
          </p>
        </div>

        {/* 13. Lovvalg og værneting */}
        <div>
          <h2>13. Lovvalg og værneting</h2>
          <p className="mt-3">
            Disse handelsbetingelser er underlagt dansk ret. Enhver tvist, der udspringer af
            eller har forbindelse med disse betingelser eller et køb hos PhoneSpot, og som ikke
            kan løses i mindelighed, afgøres ved de danske domstole med Retten i Slagelse som
            første instans, medmindre ufravigelige forbrugerretlige regler foreskriver et andet
            værneting.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
