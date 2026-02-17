import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { ConditionExplainer } from "@/components/product/condition-explainer";

export const metadata: Metadata = {
  title: "Kvalitet & Stand - Hvad betyder Grade A, B og C? | PhoneSpot",
  description:
    "Forstå vores graderingssystem og 30-punkts testproces. Alle enheder er kvalitetstestede med minimum 24 måneders garanti.",
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

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TEST_PROCESS = [
  {
    title: "Visuel inspektion",
    description:
      "Skærm, kabinet og porte inspiceres under forstørrelseslampe for ridser, buler og misfarvninger. Kosmetisk grade fastsættes.",
    icon: <EyeIcon />,
  },
  {
    title: "Skærm & touch",
    description:
      "Fuld touchscreen-test på alle zoner. Vi tjekker for dead pixels, farvegengivelse, lysstyrke og True Tone-funktion.",
    icon: <SmartphoneIcon />,
  },
  {
    title: "Batterikapacitet",
    description:
      "Batteriets sundhed måles med professionelt værktøj. Grade A kræver min. 85%, Grade B min. 80%, Grade C min. 75%.",
    icon: <BatteryIcon />,
  },
  {
    title: "Kamera & Face ID",
    description:
      "Alle kameraer (front + bag) testes for fokus, blitz og billedkvalitet. Face ID / Touch ID skal fungere fejlfrit.",
    icon: <CameraIcon />,
  },
  {
    title: "Højttaler & mikrofon",
    description:
      "Lydtest af højttaler, ørehøjttaler og mikrofon. Telefonsamtaler simuleres for at sikre klar lyd i begge retninger.",
    icon: <VolumeIcon />,
  },
  {
    title: "Wi-Fi, Bluetooth & GPS",
    description:
      "Alle trådløse forbindelser testes. Wi-Fi-hastighed verificeres, Bluetooth-pairing testes, og GPS-præcision tjekkes.",
    icon: <WifiIcon />,
  },
  {
    title: "Sensorer & knapper",
    description:
      "Accelerometer, gyroskop, kompas, nærhedssensor og lysensor testes. Alle fysiske knapper skal have korrekt respons.",
    icon: <CheckCircleIcon />,
  },
  {
    title: "Fabriksnulstilling & klargøring",
    description:
      "Enheden nulstilles, opdateres til nyeste software, rengøres grundigt og pakkes i vores emballage med tilbehør.",
    icon: <ShieldIcon />,
  },
];

const BATTERY_GRADES = [
  {
    grade: "Grade A",
    minCapacity: "85%",
    description: "Batteriet holder en fuld dags brug uden problemer.",
  },
  {
    grade: "Grade B",
    minCapacity: "80%",
    description: "Udmærket batterilevetid til daglig brug.",
  },
  {
    grade: "Grade C",
    minCapacity: "75%",
    description: "God batterilevetid — perfekt med en opladning i løbet af dagen.",
  },
];

const QUALITY_FAQ = [
  {
    question: "Hvad er forskellen på refurbished og brugt?",
    answer:
      "En brugt telefon sælges som den er — uden test eller garanti. En refurbished enhed fra PhoneSpot er professionelt inspiceret, testet med 30+ kontroller, rengjort og leveres med 24 måneders garanti. Det er en helt anden oplevelse.",
  },
  {
    question: "Kan en Grade A enhed virkelig være som ny?",
    answer:
      "Ja. Grade A enheder har ingen synlige brugstegn på skærm eller kabinet. De fleste kunder kan ikke se forskel på en Grade A og en fabriksny enhed. Den eneste forskel er prisen — du sparer typisk 30-40%.",
  },
  {
    question: "Hvad sker der hvis min enhed har en fejl?",
    answer:
      "Du er dækket af 24 måneders garanti. Kontakt os, og vi løser problemet — enten med reparation, ombytning eller fuld refundering. Vi har også 14 dages fortrydelsesret, ingen spørgsmål stillet.",
  },
  {
    question: "Kan jeg se billeder af den specifikke enhed jeg køber?",
    answer:
      "Vores graderingssystem sikrer at du ved præcis hvad du kan forvente kosmetisk. På kvalitetssiden her kan du se eksempler på hver grade. Alle enheder inden for samme grade har samme kosmetiske standard.",
  },
  {
    question: "Tester I også bærbare computere på samme måde?",
    answer:
      "Ja. Bærbare gennemgår samme grundige testproces plus ekstra kontroller: tastatur, trackpad, skærmhængsler, porte og batterilevetid under belastning. Vi installerer en ren version af operativsystemet.",
  },
  {
    question: "Hvad med vandskade — tjekker I for det?",
    answer:
      "Absolut. Alle enheder inspiceres for vandskadeindikatorer. Enheder med vandskade sælges aldrig som refurbished hos PhoneSpot.",
  },
];

const COMPARISON = [
  { feature: "Pris", new: "Fuld pris", refurbished: "Spar 20-40%" },
  { feature: "Garanti", new: "24 mdr. (producent)", refurbished: "24 mdr. (PhoneSpot)" },
  { feature: "Kvalitetstest", new: "Fabrikskontrol", refurbished: "30+ individuelle tests" },
  { feature: "Bæredygtighed", new: "Ny produktion", refurbished: "Genbrugt — 80% mindre CO2" },
  { feature: "Levering", new: "1-3 hverdage", refurbished: "1-2 hverdage" },
  { feature: "Fortrydelsesret", new: "14 dage", refurbished: "14 dage" },
  { feature: "Funktionalitet", new: "100%", refurbished: "100%" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KvalitetPage() {
  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
          Vores kvalitetsløfte
        </p>
        <Heading size="xl" className="text-white">
          Kvalitet du kan stole på
        </Heading>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Hver eneste enhed hos PhoneSpot gennemgår en grundig 30-punkts
          testproces, før den når dig. Vi graderer ærligt, tester grundigt
          og giver dig 24 måneders garanti — fordi vi tror på det vi sælger.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 30+ kvalitetstests
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 24 måneders garanti
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> 14 dages fortrydelsesret
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-eco">✓</span> e-mærket godkendt
          </span>
        </div>
      </SectionWrapper>

      {/* ── Grading system ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vores graderingssystem
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Vi bruger tre graderinger baseret på enhedens kosmetiske stand.
            Funktionelt er alle enheder 100% — forskellen er udelukkende
            kosmetisk. Swipe mellem forside og bagside for at se eksempler.
          </p>
        </div>
        <div className="mt-12">
          <ConditionExplainer />
        </div>
      </SectionWrapper>

      {/* ── 30-punkt testproces ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Vores 30-punkts testproces
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Hver enhed testes individuelt af vores teknikere. Her er de 8
            vigtigste trin i processen — fra inspektion til klargøring.
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
      </SectionWrapper>

      {/* ── Batterigaranti ── */}
      <SectionWrapper>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Batteri
            </p>
            <Heading as="h2" size="md">
              Batteri du kan regne med
            </Heading>
            <p className="mt-4 text-gray leading-relaxed">
              Batteriet er en af de vigtigste dele af din enhed. Derfor tester
              vi batterikapaciteten på alle enheder med professionelt
              diagnostisk værktøj — ikke bare Apples egen batteriindikator.
            </p>
            <p className="mt-3 text-gray leading-relaxed">
              Vores minimumsgrænser er strengere end branchestandarden, og
              enheder der ikke opfylder kravene sælges ikke som refurbished.
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Ny vs Refurbished sammenligning ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Ny vs. Refurbished
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Se hvordan en refurbished enhed fra PhoneSpot sammenligner med at
            købe ny.
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
                  Ny
                </th>
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                  PhoneSpot
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i < COMPARISON.length - 1 ? "border-b border-sand/60" : ""}
                >
                  <td className="px-5 py-3 font-semibold text-charcoal">
                    {row.feature}
                  </td>
                  <td className="px-5 py-3 text-gray">{row.new}</td>
                  <td className="px-5 py-3 font-medium text-green-eco">
                    {row.refurbished}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionWrapper>

      {/* ── Garanti & tryghed ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            24 måneders garanti — uden besvær
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alle refurbished produkter fra PhoneSpot leveres med 24 måneders
            garanti. Hvis noget går galt, løser vi det hurtigt og ukompliceret.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
              <ShieldIcon />
            </div>
            <h3 className="font-display text-base font-bold text-charcoal">
              24 mdr. garanti
            </h3>
            <p className="mt-2 text-sm text-gray">
              Dækker fabrikationsfejl og funktionelle mangler. Kontakt os, og
              vi tager os af resten.
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
              tilbage. Ingen spørgsmål.
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
              inden for 24 timer på hverdage.
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
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "1.000+", label: "Enheder solgt" },
            { value: "30+", label: "Kvalitetstests per enhed" },
            { value: "24", label: "Måneders garanti" },
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
          <Heading as="h2" size="md">
            Ofte stillede spørgsmål om kvalitet
          </Heading>
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

      {/* ── Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Overbevist? Find din næste enhed
          </Heading>
          <p className="mt-4 text-gray">
            Udforsk vores udvalg af kvalitetstestede enheder med 24 måneders
            garanti og 14 dages fortrydelsesret.
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
