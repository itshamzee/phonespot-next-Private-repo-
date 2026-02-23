import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";
import { GradeSlider } from "@/components/home/grade-slider";

export const metadata: Metadata = {
  title:
    "Refurbished iPhone & iPad Kvalitet | 30+ Tests & 36 Mdr. Garanti | PhoneSpot",
  description:
    "Hvordan sikrer PhoneSpot kvaliteten på refurbished iPhones og iPads? Se vores 30-punkts testproces, graderingssystem (A/B/C) og 36 måneders garanti. Spar op til 40% uden at gå på kompromis.",
  keywords:
    "refurbished iphone, refurbished ipad, brugt iphone kvalitet, refurbished telefon garanti, grade a iphone, refurbished vs brugt, kvalitetstestet iphone, refurbished danmark",
  alternates: {
    canonical: "https://phonespot.dk/kvalitet",
  },
  openGraph: {
    title: "Refurbished Kvalitet Du Kan Stole På | PhoneSpot",
    description:
      "30+ kvalitetstests, ærlig gradering og 36 måneders garanti. Se hvordan vi sikrer at hver refurbished enhed lever op til vores standard.",
    url: "https://phonespot.dk/kvalitet",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// JSON-LD Structured Data (static, build-time only — no user input)
// ---------------------------------------------------------------------------

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Hvad er forskellen på refurbished og brugt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "En brugt telefon sælges typisk som den er — ofte uden test, garanti eller klargøring. En refurbished enhed fra PhoneSpot er noget helt andet. Hver enhed gennemgår vores 30-punkts testproces, bliver professionelt inspiceret af uddannede teknikere, grundigt rengjort og leveres med 36 måneders garanti.",
      },
    },
    {
      "@type": "Question",
      name: "Kan en Grade A refurbished iPhone virkelig være som ny?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Grade A enheder har ingen synlige brugstegn på hverken skærm eller kabinet. De fleste af vores kunder kan ikke se forskel på en Grade A enhed og en fabriksny. Batteriet er testet til minimum 85% kapacitet, og al funktionalitet er verificeret. Den eneste reelle forskel er prisen — du sparer typisk 30-40% sammenlignet med ny.",
      },
    },
    {
      "@type": "Question",
      name: "Er det sikkert at købe en refurbished iPhone i Danmark?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hos PhoneSpot er det lige så sikkert som at købe nyt. Vi er e-mærket godkendt, hvilket betyder at vi overholder alle danske regler for nethandel. Du får 36 måneders garanti, 14 dages fuld fortrydelsesret og dansk kundesupport.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad sker der hvis min refurbished enhed har en fejl?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Du er dækket af 36 måneders garanti. Kontakt vores danske support, og vi løser problemet — enten med reparation, ombytning eller fuld refundering. Du har også 14 dages fortrydelsesret fra leveringsdagen.",
      },
    },
    {
      "@type": "Question",
      name: "Hvad er forskellen på Grade A, B og C?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Graderingen handler udelukkende om kosmetisk stand — alle enheder er funktionelt 100%. Grade A er som ny uden synlige brugsspor. Grade B er i meget god stand med lette brugsspor på kabinettet. Grade C har synlige brugsspor men er det mest budgetvenlige valg.",
      },
    },
    {
      "@type": "Question",
      name: "Tester I også bærbare computere og iPads på samme måde?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Alle produktkategorier gennemgår vores grundige testproces. Bærbare og iPads får desuden ekstra kontroller: tastatur, trackpad, skærmhængsler, alle porte og batterilevetid under belastning.",
      },
    },
    {
      "@type": "Question",
      name: "Tjekker I for vandskade på refurbished enheder?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolut. Alle enheder inspiceres grundigt for vandskadeindikatorer som en del af vores 30-punkts testproces. Enheder med tegn på vandskade sælges aldrig som refurbished hos PhoneSpot.",
      },
    },
    {
      "@type": "Question",
      name: "Hvor lang garanti får man på en refurbished telefon fra PhoneSpot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Alle refurbished enheder fra PhoneSpot leveres med 36 måneders garanti — det er samme garantiperiode som du får ved køb af en ny enhed. Garantien dækker fabrikationsfejl og funktionelle mangler.",
      },
    },
    {
      "@type": "Question",
      name: "Er refurbished telefoner bæredygtige?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Ved at vælge refurbished frem for ny sparer du op til 80% af den CO2-udledning der går til at producere en ny enhed. Du forlænger enhedens levetid og reducerer elektronisk affald.",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Icons (reused across sections)
// ---------------------------------------------------------------------------

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SmartphoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 1c1 2 2 4.5 2 8 0 5.5-4.78 11-10 11Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TEST_PROCESS = [
  {
    title: "Visuel inspektion",
    description:
      "Skærm, kabinet og porte inspiceres under forstørrelseslampe for ridser, buler og misfarvninger. Den kosmetiske grade fastsættes ud fra strenge kriterier — så du ved præcis hvad du får.",
    icon: <EyeIcon />,
  },
  {
    title: "Skærm & touch",
    description:
      "Fuld touchscreen-test på alle zoner, pixel for pixel. Vi tjekker for dead pixels, farvegengivelse, lysstyrke og True Tone. En skærm der ikke lever op til standarden, sælges ikke.",
    icon: <SmartphoneIcon />,
  },
  {
    title: "Batterikapacitet",
    description:
      "Batteriets sundhed måles med professionelt diagnostisk værktøj — ikke blot Apples egen indikator. Grade A kræver min. 85%, Grade B min. 80%, Grade C min. 75%. Under grænsen? Så sælges den ikke.",
    icon: <BatteryIcon />,
  },
  {
    title: "Kamera & Face ID",
    description:
      "Front- og bagkamera testes for fokus, blitz, billedstabilisering og billedkvalitet i både dagslys og mørke. Face ID eller Touch ID skal fungere fejlfrit — det er et ufravigeligt krav.",
    icon: <CameraIcon />,
  },
  {
    title: "Højttaler & mikrofon",
    description:
      "Lydtest af højttaler, ørehøjttaler og mikrofon. Vi simulerer telefonsamtaler for at sikre klar lyd i begge retninger. Ingen knitren, ingen dødzoner, ingen kompromiser.",
    icon: <VolumeIcon />,
  },
  {
    title: "Wi-Fi, Bluetooth & GPS",
    description:
      "Alle trådløse forbindelser verificeres. Wi-Fi-hastighed testes, Bluetooth-pairing gennemføres, og GPS-præcision kontrolleres. Din enhed skal forbinde lige så hurtigt som en ny.",
    icon: <WifiIcon />,
  },
  {
    title: "Sensorer & knapper",
    description:
      "Accelerometer, gyroskop, kompas, nærhedssensor og lysensor — alle testes individuelt. Fysiske knapper skal have korrekt taktil respons. Selv den mindste afvigelse fanges her.",
    icon: <CheckCircleIcon />,
  },
  {
    title: "Nulstilling & klargøring",
    description:
      "Enheden fabriksnulstilles, opdateres til nyeste iOS/macOS, rengøres grundigt med professionelle midler og pakkes omhyggeligt i vores emballage med ladekabel og dokumentation.",
    icon: <ShieldIcon />,
  },
];

const BATTERY_GRADES = [
  {
    grade: "Grade A",
    minCapacity: "85%",
    description:
      "Holder en fuld dags intensiv brug. Sammenlignelig med et batteri der er få måneder gammelt.",
    detail: "Min. 85% af original kapacitet",
  },
  {
    grade: "Grade B",
    minCapacity: "80%",
    description:
      "Udmærket batterilevetid til daglig brug. De fleste når aftenen uden problemer.",
    detail: "Min. 80% af original kapacitet",
  },
  {
    grade: "Grade C",
    minCapacity: "75%",
    description:
      "God batterilevetid til budgetbevidste. Perfekt med en opladning i løbet af dagen.",
    detail: "Min. 75% af original kapacitet",
  },
];

const QUALITY_FAQ = [
  {
    question: "Hvad er forskellen på refurbished og brugt?",
    answer:
      "En brugt telefon sælges typisk som den er — ofte uden test, garanti eller klargøring. En refurbished enhed fra PhoneSpot er noget helt andet. Hver enhed gennemgår vores 30-punkts testproces, bliver professionelt inspiceret af uddannede teknikere, grundigt rengjort og leveres med 36 måneders garanti. Tænk på det som forskellen mellem at købe en brugt bil fra en privat sælger og en certificeret brugtbil fra en autoriseret forhandler — du får tryghed, kvalitet og garanti.",
  },
  {
    question: "Kan en Grade A refurbished iPhone virkelig være som ny?",
    answer:
      "Ja. Grade A enheder har ingen synlige brugstegn på hverken skærm eller kabinet. De fleste af vores kunder kan faktisk ikke se forskel på en Grade A enhed og en fabriksny. Batteriet er testet til minimum 85% kapacitet, og al funktionalitet er 100% verificeret gennem vores 30-punkts testproces. Den eneste reelle forskel er prisen — du sparer typisk 30-40% sammenlignet med en fabriksny enhed.",
  },
  {
    question: "Er det sikkert at købe en refurbished iPhone i Danmark?",
    answer:
      "Hos PhoneSpot er det lige så sikkert som at købe nyt. Vi er e-mærket godkendt, hvilket betyder at vi overholder alle danske regler for nethandel og forbrugerbeskyttelse. Du får 36 måneders garanti, 14 dages fuld fortrydelsesret og dansk kundesupport. Vi er en dansk virksomhed der står bag hvert eneste produkt vi sælger — du handler aldrig med en anonym sælger.",
  },
  {
    question: "Hvad sker der hvis min refurbished enhed har en fejl?",
    answer:
      "Du er dækket af 36 måneders garanti. Kontakt vores danske support, og vi løser problemet — enten med reparation, ombytning eller fuld refundering. Processen er enkel: send os en besked, få et returetiket, og vi håndterer resten. Du har også 14 dages fortrydelsesret fra leveringsdagen, ingen spørgsmål stillet.",
  },
  {
    question: "Hvad er forskellen på Grade A, B og C?",
    answer:
      "Graderingen handler udelukkende om kosmetisk stand — alle enheder er funktionelt 100% og har bestået samme 30-punkts testproces. Grade A er som ny uden synlige brugsspor og med batteri på min. 85%. Grade B er i meget god stand med lette brugsspor på kabinettet og batteri på min. 80%. Grade C har synlige brugsspor men er det mest budgetvenlige valg med batteri på min. 75%. Uanset grade får du samme garanti og samme funktionalitet.",
  },
  {
    question: "Tester I også bærbare computere og iPads på samme måde?",
    answer:
      "Ja. Alle produktkategorier — iPhones, iPads og bærbare — gennemgår vores grundige testproces. Bærbare og iPads får desuden ekstra kontroller: tastatur, trackpad, skærmhængsler, alle porte og batterilevetid under belastning. Vi installerer en ren version af operativsystemet med de nyeste opdateringer, så enheden er klar til brug fra dag ét.",
  },
  {
    question: "Tjekker I for vandskade på refurbished enheder?",
    answer:
      "Absolut. Alle enheder inspiceres grundigt for vandskadeindikatorer som en fast del af vores 30-punkts testproces. Enheder med tegn på vandskade sælges aldrig som refurbished hos PhoneSpot — de sorteres fra allerede i den indledende inspektion. Du kan være helt tryg ved at enheden du modtager, er fri for vandskade.",
  },
  {
    question:
      "Hvor lang garanti får man på en refurbished telefon fra PhoneSpot?",
    answer:
      "Alle refurbished enheder fra PhoneSpot leveres med 36 måneders garanti — det er præcis samme garantiperiode som du får ved køb af en fabriksny enhed. Garantien dækker fabrikationsfejl og funktionelle mangler. Du er desuden dækket af dansk forbrugerlovgivning og vores 14 dages fortrydelsesret. Mange af vores konkurrenter tilbyder kun 6-12 måneders garanti — vi giver dig dobbelt så lang dækning.",
  },
  {
    question: "Er refurbished telefoner bæredygtige?",
    answer:
      "Ja, og det er faktisk en af de største fordele ved at vælge refurbished. Ved at vælge en refurbished enhed frem for ny sparer du op til 80% af den CO\u2082-udledning der går til at producere en ny telefon. Du forlænger enhedens levetid, reducerer elektronisk affald og mindsker behovet for ny råstofudvinding. Det er et af de nemmeste og mest effektive klimavalg du kan træffe i hverdagen — og du sparer penge samtidig.",
  },
];

const COMPARISON = [
  { feature: "Pris", newDevice: "Fuld pris", refurbished: "Spar 20-40%" },
  {
    feature: "Garanti",
    newDevice: "24 mdr. (producent)",
    refurbished: "36 mdr. (PhoneSpot)",
  },
  {
    feature: "Kvalitetstest",
    newDevice: "Fabrikskontrol",
    refurbished: "30+ individuelle tests",
  },
  {
    feature: "Bæredygtighed",
    newDevice: "Ny produktion & råstoffer",
    refurbished: "Op til 80% mindre CO\u2082",
  },
  {
    feature: "Levering",
    newDevice: "1-3 hverdage",
    refurbished: "1-2 hverdage",
  },
  {
    feature: "Fortrydelsesret",
    newDevice: "14 dage",
    refurbished: "14 dage",
  },
  {
    feature: "Funktionalitet",
    newDevice: "100%",
    refurbished: "100%",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KvalitetPage() {
  return (
    <>
      {/* JSON-LD structured data for FAQ rich snippets (static content only) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
          Vores kvalitetsløfte
        </p>
        <Heading size="xl" className="text-white">
          Refurbished kvalitet du kan mærke forskel på
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Hos PhoneSpot er &ldquo;refurbished&rdquo; ikke bare et ord — det er
          et løfte. Hver eneste iPhone, iPad og bærbar gennemgår vores grundige
          30-punkts testproces, før den når dine hænder. Vi graderer ærligt,
          tester grundigt og giver dig 36 måneders garanti — fordi vi tror på
          det vi sælger. Spar op til 40% sammenlignet med ny, uden at gå på
          kompromis med kvaliteten.
        </p>

        {/* Kvalitetsløfte checkliste fra forsiden */}
        <div className="mx-auto mt-10 max-w-2xl">
          <ul className="grid gap-3 text-left sm:grid-cols-2">
            {[
              "Professionel diagnostik med certificeret værktøj",
              "Ærlig gradering — A, B eller C, aldrig pyntet på",
              "Batterikapacitet altid oplyst og verificeret",
              "Ren software-installation og nyeste opdateringer",
              "Grundig rengøring og omhyggelig pakning",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-white/80"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-eco/20 text-green-eco">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 30+ kvalitetstests
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 36 måneders garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 14 dages fortrydelsesret
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> e-mærket godkendt
          </span>
        </div>

        <div className="mt-8">
          <Link
            href="/iphones"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Se vores udvalg &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Kvalitetsløfte med GradeSlider ── */}
      <SectionWrapper>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Vores kvalitetsløfte
            </p>
            <Heading as="h2" size="md">
              30+ tests. Hver eneste enhed.
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              Skærm, batteri, kamera, sensorer, højttalere, Face ID — vi tester
              alt. Enheder der ikke lever op til vores standard, sælges ikke som
              refurbished. Vælg mellem Grade A, B og C og se præcis hvad du kan
              forvente.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Professionel diagnostik med certificeret værktøj",
                "Ærlig gradering — A, B eller C, aldrig pyntet på",
                "Batterikapacitet altid oplyst og verificeret",
                "Ren software-installation og nyeste opdateringer",
                "Grundig rengøring og omhyggelig pakning",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-charcoal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-eco"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Grade slider */}
          <div>
            <GradeSlider />
            <div className="mt-4 text-center">
              <Link
                href="/iphones"
                className="inline-block text-sm font-semibold text-green-eco hover:underline"
              >
                Se detaljerede eksempler &rarr;
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Grading system detaljeret ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Graderingssystem
          </p>
          <Heading as="h2" size="lg">
            Grade A, B og C — hvad betyder det?
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi bruger tre graderinger baseret på enhedens kosmetiske stand.
            Funktionelt er alle enheder 100% — forskellen er udelukkende
            kosmetisk. Det betyder, at uanset om du vælger Grade A, B eller C,
            får du en enhed der fungerer lige så godt som en ny. Klik mellem
            forside og bagside for at se præcis hvad du kan forvente.
          </p>
        </div>
        <div className="mt-12">
          <ConditionExplainer />
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/iphones"
            className="text-sm font-medium text-green-eco underline underline-offset-2 transition-colors hover:text-green-eco/80"
          >
            Se priser på alle grades &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── 30-punkt testproces ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Vores proces
          </p>
          <Heading as="h2" size="lg">
            30+ kvalitetstests — hver eneste enhed
          </Heading>
          <p className="mt-4 text-lg text-gray">
            De fleste forhandlere af brugte telefoner kigger enheden hurtigt
            igennem og sender den videre. Hos PhoneSpot gør vi det anderledes.
            Hver enhed testes individuelt af vores teknikere i en systematisk
            proces med over 30 kontrolpunkter. Her er de 8 vigtigste trin — fra
            den første inspektion til den færdige pakning.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEST_PROCESS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                {step.icon}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-eco">
                Trin {index + 1}
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-charcoal">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray">
          Enheder der ikke består alle 30+ tests, sælges ikke som refurbished
          hos PhoneSpot. Vores afvisningsrate sikrer, at kun de bedste enheder
          når videre til dig.
        </p>
      </SectionWrapper>

      {/* ── Batterigaranti ── */}
      <SectionWrapper>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Batteri
            </p>
            <Heading as="h2" size="md">
              Batteri du kan regne med — hver dag
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              Batteriet er hjertet i din enhed, og det er noget mange
              konkurrenter springer let hen over. Hos PhoneSpot tester vi
              batterikapaciteten på alle enheder med professionelt diagnostisk
              værktøj — ikke blot Apples egen batteriindikator, der kan være
              upræcis.
            </p>
            <p className="mt-3 text-gray leading-relaxed">
              Vores minimumsgrænser er strengere end branchestandarden. En
              iPhone med 85% batterikapacitet holder stadig en fuld dags brug
              med skærmtid, opkald og apps. Enheder der ikke opfylder vores
              krav, sælges ganske enkelt ikke som refurbished.
            </p>
            <p className="mt-3 text-sm font-medium text-charcoal">
              Batterikapaciteten oplyses altid, så du ved præcis hvad du køber.
            </p>
          </div>
          <div className="space-y-4">
            {BATTERY_GRADES.map((bg) => (
              <div
                key={bg.grade}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-eco text-lg font-bold text-white">
                  {bg.minCapacity}
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-[1px] text-charcoal">
                    {bg.grade}
                  </p>
                  <p className="mt-0.5 text-sm text-gray">{bg.description}</p>
                  <p className="mt-0.5 text-xs text-gray/70">{bg.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Ny vs Refurbished sammenligning ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Sammenligning
          </p>
          <Heading as="h2" size="md">
            Ny vs. refurbished — hvad får du egentlig?
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Mange tøver med at købe refurbished, fordi de tror det er det samme
            som &ldquo;brugt&rdquo;. Sandheden er, at en professionelt
            refurbished enhed fra PhoneSpot matcher en ny på alle de punkter der
            betyder noget — og overgår den på pris og bæredygtighed.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand bg-sand/50">
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                  &nbsp;
                </th>
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                  Ny enhed
                </th>
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                  PhoneSpot Refurbished
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={
                    i < COMPARISON.length - 1 ? "border-b border-sand/60" : ""
                  }
                >
                  <td className="px-5 py-3 font-semibold text-charcoal">
                    {row.feature}
                  </td>
                  <td className="px-5 py-3 text-gray">{row.newDevice}</td>
                  <td className="px-5 py-3 font-medium text-green-eco">
                    {row.refurbished}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/iphones"
            className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Se hvad du kan spare &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Bæredygtighed ── */}
      <SectionWrapper>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Bæredygtighed
            </p>
            <Heading as="h2" size="md">
              Et bedre valg for din pung — og for planeten
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              Produktion af en ny smartphone kræver sjældne mineraler,
              energikrævende processer og skaber betydelig CO&#8322;-udledning.
              Ved at vælge refurbished forlænger du enhedens levetid og sparer
              op til 80% af den CO&#8322; der bruges til at producere en ny.
            </p>
            <p className="mt-3 text-gray leading-relaxed">
              Det er et af de nemmeste klimavalg du kan træffe i hverdagen — og
              du sparer tusindvis af kroner samtidig. Med PhoneSpot behøver du
              ikke vælge mellem kvalitet, pris og samvittighed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <LeafIcon />
              </div>
              <p className="font-display text-3xl font-bold text-green-eco">
                80%
              </p>
              <p className="mt-1 text-xs text-gray">Mindre CO&#8322;</p>
            </div>
            <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <SmartphoneIcon />
              </div>
              <p className="font-display text-3xl font-bold text-green-eco">
                2+ år
              </p>
              <p className="mt-1 text-xs text-gray">Ekstra levetid</p>
            </div>
            <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <BatteryIcon />
              </div>
              <p className="font-display text-3xl font-bold text-green-eco">
                40%
              </p>
              <p className="mt-1 text-xs text-gray">Lavere pris</p>
            </div>
            <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <CheckCircleIcon />
              </div>
              <p className="font-display text-3xl font-bold text-green-eco">
                100%
              </p>
              <p className="mt-1 text-xs text-gray">Funktionalitet</p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Garanti & tryghed ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Din tryghed
          </p>
          <Heading as="h2" size="md">
            36 måneders garanti — uden besvær
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alle refurbished produkter fra PhoneSpot leveres med 36 måneders
            garanti — præcis som ved køb af nyt. Hvis noget går galt, løser vi
            det hurtigt og ukompliceret. Mange af vores konkurrenter tilbyder
            kun 6-12 måneders garanti. Vi giver dig dobbelt så lang dækning,
            fordi vi stoler på kvaliteten af det vi sælger.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
              <ShieldIcon />
            </div>
            <h3 className="font-display text-base font-bold text-charcoal">
              36 mdr. garanti
            </h3>
            <p className="mt-2 text-sm text-gray">
              Dækker fabrikationsfejl og funktionelle mangler i hele 36 måneder.
              Kontakt os, og vi tager os af resten — reparation, ombytning eller
              refundering.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
            <h3 className="font-display text-base font-bold text-charcoal">
              14 dages returret
            </h3>
            <p className="mt-2 text-sm text-gray">
              Ikke tilfreds? Returner enheden inden 14 dage og få dine penge
              tilbage. Ingen spørgsmål stillet, ingen skjulte gebyrer. Vi sender
              dig et returetiket.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 className="font-display text-base font-bold text-charcoal">
              Dansk support
            </h3>
            <p className="mt-2 text-sm text-gray">
              Kontakt os på dansk via email eller telefon. Vi svarer typisk
              inden for 24 timer på hverdage. Rigtige mennesker, ikke chatbots.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Tal der taler ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md" className="text-white">
            Tal der taler for sig selv
          </Heading>
          <p className="mt-4 text-white/50">
            Bag ordene står resultaterne. Her er de tal vi er mest stolte af.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "1.000+", label: "Enheder solgt" },
            { value: "30+", label: "Kvalitetstests per enhed" },
            { value: "36", label: "Måneders garanti" },
            { value: "4.5/5", label: "På Trustpilot" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-4xl font-bold text-green-eco md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Spørgsmål & svar
          </p>
          <Heading as="h2" size="md">
            Alt du vil vide om refurbished kvalitet
          </Heading>
          <p className="mt-4 text-gray">
            Vi har samlet de mest stillede spørgsmål om vores kvalitetsproces,
            gradering og garanti. Kan du ikke finde svar på dit spørgsmål?{" "}
            <Link
              href="/kontakt"
              className="font-medium text-green-eco underline underline-offset-2"
            >
              Kontakt os
            </Link>
            .
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {QUALITY_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-charcoal">
                {item.question}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Guides ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="sm">
            Læs mere om refurbished
          </Heading>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link
              href="/blog/refurbished-vs-brugt-guide"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Refurbished vs brugt
              </p>
              <p className="mt-1 text-xs text-gray">
                Forstå forskellen og vælg det rigtige
              </p>
            </Link>
            <Link
              href="/blog/bedste-refurbished-iphone-2026"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Bedste refurbished iPhone 2026
              </p>
              <p className="mt-1 text-xs text-gray">
                Guide til at vælge den rigtige model
              </p>
            </Link>
            <Link
              href="/garanti"
              className="rounded-2xl bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-display text-sm font-bold text-charcoal">
                Vores 36 mdr. garanti
              </p>
              <p className="mt-1 text-xs text-gray">
                Fuld dækning og tryghed
              </p>
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Klar til at spare — uden at gå på kompromis?
          </Heading>
          <p className="mt-4 text-gray">
            Udforsk vores udvalg af kvalitetstestede refurbished iPhones, iPads
            og bærbare med 36 måneders garanti og 14 dages fortrydelsesret.
            Levering på 1-2 hverdage.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se iPhones &rarr;
            </Link>
            <Link
              href="/ipads"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se iPads &rarr;
            </Link>
            <Link
              href="/baerbare"
              className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
            >
              Se bærbare &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
