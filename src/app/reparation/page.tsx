import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title:
    "iPhone & iPad Reparation | Skærm, Batteri & Mere | PhoneSpot",
  description:
    "Professionel reparation af iPhones, iPads og MacBooks. Skærmskift, batteriskift, vandskade og mere. Faste priser, hurtig service og garanti på alle reparationer.",
  keywords:
    "iphone reparation, ipad reparation, skærmskift iphone, batteriskift iphone, reparation københavn, reparation danmark, macbook reparation",
  alternates: {
    canonical: "https://phonespot.dk/reparation",
  },
  openGraph: {
    title: "iPhone & iPad Reparation | PhoneSpot",
    description:
      "Professionel reparation med kvalitetsdele og garanti. Skærmskift, batteriskift, vandskade og mere. Faste priser og hurtig service.",
    url: "https://phonespot.dk/reparation",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SmartphoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function BatteryChargingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
      <polyline points="11 10 9 13 13 13 11 16" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    title: "Skærmskift",
    description:
      "Smadret, ridset eller defekt skærm? Vi udskifter din skærm med kvalitetsdele der matcher originalen. Touch, farvegengivelse og lysstyrke — alt fungerer som nyt efter reparationen.",
    details: "Ofte same-day reparation",
    icon: <SmartphoneIcon />,
  },
  {
    title: "Batteriskift",
    description:
      "Holder batteriet ikke en hel dag længere? Vi skifter til et nyt, højkapacitets batteri så din enhed kører som da den var ny. Batteriets sundhed verificeres efter montering.",
    details: "Ny batterikapacitet: 100%",
    icon: <BatteryChargingIcon />,
  },
  {
    title: "Vandskade",
    description:
      "Har din enhed fået vand? Jo hurtigere du handler, jo større er chancen for at redde den. Vi åbner enheden, renser korrosion og reparerer beskadigede komponenter professionelt.",
    details: "Tid er afgørende — kontakt os straks",
    icon: <DropletIcon />,
  },
  {
    title: "Kamera-reparation",
    description:
      "Sløret billede, defekt autofokus eller sort kamera? Vi reparerer og udskifter front- og bagkamera, så du igen kan tage skarpe billeder og bruge Face ID uden problemer.",
    details: "Front- og bagkamera",
    icon: <CameraIcon />,
  },
  {
    title: "Ladestik & porte",
    description:
      "Lader din enhed ikke ordentligt, eller virker stikket løst? Vi udskifter ladestik og Lightning/USB-C porte, så din enhed oplader pålideligt igen. Også hovedtelefonport.",
    details: "Lightning & USB-C",
    icon: <PlugIcon />,
  },
  {
    title: "Øvrige reparationer",
    description:
      "Højttalere, mikrofon, knapper, vibrationsmotor, bagglas eller andre fejl — vi diagnosticerer og reparerer de fleste problemer på iPhones, iPads og MacBooks.",
    details: "Gratis fejlfinding",
    icon: <WrenchIcon />,
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Kontakt os",
    description:
      "Beskriv problemet via vores kontaktformular eller send os en email. Vi svarer typisk inden for 24 timer med en vurdering og prisoverslag.",
  },
  {
    step: "02",
    title: "Indsend enheden",
    description:
      "Send enheden til os med posten, eller aflever den personligt. Vi sender dig en returlabel, så forsendelsen er enkel og sporbar.",
  },
  {
    step: "03",
    title: "Diagnostik & reparation",
    description:
      "Vi diagnosticerer enheden grundigt, bekræfter prisen med dig og udfører reparationen med kvalitetsdele. Ingen overraskelser undervejs.",
  },
  {
    step: "04",
    title: "Test & returnering",
    description:
      "Enheden gennemgår en funktionstest efter reparationen for at sikre alt virker perfekt. Derefter sendes den retur til dig — typisk inden for 1-2 hverdage.",
  },
];

const REPAIR_FAQ = [
  {
    question: "Hvad koster en skærmudskiftning på en iPhone?",
    answer:
      "Prisen afhænger af iPhone-modellen. Kontakt os med din model, og vi giver dig en fast pris inden reparationen. Vi bruger kvalitetsdele der matcher originalen, og alle skærmskift leveres med garanti.",
  },
  {
    question: "Hvor lang tid tager en reparation?",
    answer:
      "De fleste reparationer udføres inden for 1-3 hverdage fra vi modtager enheden. Skærmskift og batteriskift kan ofte klares på 1-2 hverdage. Ved vandskade kan det tage lidt længere afhængigt af omfanget. Vi holder dig opdateret undervejs.",
  },
  {
    question: "Får jeg garanti på reparationen?",
    answer:
      "Ja. Alle reparationer fra PhoneSpot leveres med garanti på både arbejde og reservedele. Hvis den samme fejl opstår igen inden for garantiperioden, reparerer vi enheden uden beregning.",
  },
  {
    question: "Bruger I originale reservedele?",
    answer:
      "Vi bruger højkvalitets reservedele der matcher de originale specifikationer. Det sikrer at din enhed fungerer præcis som den skal — med korrekt farvegengivelse, touch-respons og vandtæthed (hvor relevant).",
  },
  {
    question: "Kan I reparere min MacBook eller iPad?",
    answer:
      "Ja. Vi reparerer iPhones, iPads og udvalgte MacBook-modeller. Kontakt os med din enhed og problemet, og vi vurderer om vi kan hjælpe. Typiske iPad/MacBook-reparationer inkluderer skærmskift, batteriskift og tastatur-reparation.",
  },
  {
    question: "Hvad gør jeg hvis min iPhone har fået vand?",
    answer:
      "Sluk enheden med det samme og lad være med at oplade den. Kontakt os hurtigst muligt — jo hurtigere vi kan åbne og rense enheden, jo større er chancen for at redde den. Læg den IKKE i ris, det hjælper ikke og kan forværre skaden.",
  },
  {
    question: "Mister jeg mine data under reparationen?",
    answer:
      "Ved de fleste reparationer (skærmskift, batteriskift, ladestik) bevares dine data. Ved vandskade eller mere komplekse reparationer kan der i sjældne tilfælde være risiko for datatab. Vi anbefaler altid at tage backup inden du sender enheden, hvis det er muligt.",
  },
  {
    question: "Kan I reparere en enhed der er købt et andet sted?",
    answer:
      "Ja. Vi reparerer alle iPhones, iPads og MacBooks uanset hvor de er købt. Du behøver ikke have købt enheden hos PhoneSpot for at benytte vores reparationsservice.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReparationPage() {
  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <FadeIn>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Professionel reparation
          </p>
          <Heading size="xl" className="text-white">
            Vi fikser din iPhone, iPad & MacBook
          </Heading>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Smadret skærm? Dårligt batteri? Vandskade? PhoneSpot tilbyder
            professionel reparation med kvalitetsdele, faste priser og garanti
            på alt arbejde. Ingen overraskelser, ingen skjulte gebyrer — bare
            en enhed der virker igen.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-2">
              <span className="text-green-eco">✓</span> Faste priser
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-eco">✓</span> Garanti på reparation
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-eco">✓</span> Kvalitetsdele
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-eco">✓</span> Hurtig service
            </span>
          </div>
          <div className="mt-8">
            <Link
              href="/kontakt"
              className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Book en reparation &rarr;
            </Link>
          </div>
        </FadeIn>
      </SectionWrapper>

      {/* ── Services ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Vores services
            </p>
            <Heading as="h2" size="lg">
              Hvad kan vi reparere?
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Vi reparerer de fleste fejl på iPhones, iPads og MacBooks.
              Uanset om det er en smadret skærm, et slidet batteri eller en
              vandskade — vi har løsningen.
            </p>
          </FadeIn>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  {service.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray">
                  {service.description}
                </p>
                <p className="mt-3 text-xs font-semibold text-green-eco">
                  {service.details}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Hvorfor PhoneSpot ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Hvorfor os
            </p>
            <Heading as="h2" size="md">
              Derfor vælger kunder PhoneSpot til reparation
            </Heading>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <FadeIn delay={0}>
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <TagIcon />
              </div>
              <h3 className="font-display text-base font-bold text-charcoal">
                Faste priser
              </h3>
              <p className="mt-2 text-sm text-gray">
                Vi oplyser altid prisen inden vi starter. Du godkender prisen
                før reparationen begynder. Ingen overraskelser, ingen skjulte
                gebyrer — det du hører, er det du betaler.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <ClockIcon />
              </div>
              <h3 className="font-display text-base font-bold text-charcoal">
                Hurtig service
              </h3>
              <p className="mt-2 text-sm text-gray">
                De fleste reparationer udføres inden for 1-3 hverdage.
                Skærmskift og batteriskift kan ofte klares på 1-2 dage. Vi
                prioriterer at få din enhed tilbage til dig hurtigst muligt.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                <ShieldIcon />
              </div>
              <h3 className="font-display text-base font-bold text-charcoal">
                Garanti på alt
              </h3>
              <p className="mt-2 text-sm text-gray">
                Alle reparationer leveres med garanti på både arbejde og
                reservedele. Hvis den samme fejl opstår igen, reparerer vi det
                uden beregning. Du er dækket.
              </p>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Sådan fungerer det ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Processen
            </p>
            <Heading as="h2" size="md" className="text-white">
              Sådan får du din enhed repareret
            </Heading>
            <p className="mt-4 text-white/60">
              Fra første kontakt til du har din enhed igen — her er de 4 trin
              i vores reparationsproces.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((item, i) => (
            <FadeIn key={item.step} delay={i * 0.1}>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-green-eco">
                  {item.step}
                </p>
                <h3 className="mt-2 font-display text-lg font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {item.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Priser ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Priser
            </p>
            <Heading as="h2" size="md">
              Vejledende priser på reparation
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Alle priser er vejledende og afhænger af model og skadens omfang.
              Kontakt os for en præcis pris på din reparation — vi oplyser
              altid prisen inden vi starter.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand bg-sand/50">
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                  Reparation
                </th>
                <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-[2px] text-charcoal">
                  Tidsestimat
                </th>
                <th className="px-5 py-3 text-right font-display text-xs font-semibold uppercase tracking-[2px] text-green-eco">
                  Fra pris
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  service: "Skærmskift iPhone",
                  time: "1-2 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Batteriskift iPhone",
                  time: "1-2 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Skærmskift iPad",
                  time: "2-3 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Kamera-reparation",
                  time: "1-3 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Ladestik-reparation",
                  time: "1-2 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Vandskade-behandling",
                  time: "2-5 hverdage",
                  price: "Kontakt os",
                },
                {
                  service: "Diagnostik / fejlfinding",
                  time: "1 hverdag",
                  price: "Gratis",
                },
              ].map((row, i, arr) => (
                <tr
                  key={row.service}
                  className={
                    i < arr.length - 1 ? "border-b border-sand/60" : ""
                  }
                >
                  <td className="px-5 py-3 font-semibold text-charcoal">
                    {row.service}
                  </td>
                  <td className="px-5 py-3 text-gray">{row.time}</td>
                  <td className="px-5 py-3 text-right font-medium text-green-eco">
                    {row.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-gray">
          Alle priser er inkl. moms, reservedele og garanti. Vi oplyser altid
          den endelige pris inden reparationen starter.
        </p>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Spørgsmål & svar
            </p>
            <Heading as="h2" size="md">
              Ofte stillede spørgsmål om reparation
            </Heading>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {REPAIR_FAQ.map((item) => (
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

      {/* ── Alternative: buy refurbished ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="sm">
            Overvejer du en ny enhed i stedet?
          </Heading>
          <p className="mt-3 text-sm text-gray">
            Hvis reparationen ikke kan betale sig, kan en kvalitetstestet
            refurbished enhed være det smartere valg — med 36 måneders garanti
            og op til 40% besparelse.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/iphones"
              className="text-sm font-semibold text-green-eco hover:underline"
            >
              Se refurbished iPhones &rarr;
            </Link>
            <Link
              href="/ipads"
              className="text-sm font-semibold text-green-eco hover:underline"
            >
              Se refurbished iPads &rarr;
            </Link>
            <Link
              href="/baerbare"
              className="text-sm font-semibold text-green-eco hover:underline"
            >
              Se refurbished bærbare &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Trust bar ── */}
      <SectionWrapper>
        <TrustBar />
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md" className="text-white">
              Klar til at få din enhed fikset?
            </Heading>
            <p className="mt-4 text-white/60">
              Beskriv problemet, og vi vender hurtigt tilbage med en fast pris
              og tidsestimat. Gratis diagnostik på alle enheder.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os nu &rarr;
              </Link>
              <Link
                href="/reservedele"
                className="inline-block rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
              >
                Se reservedele &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}
