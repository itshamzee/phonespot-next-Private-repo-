import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { StoreLocation } from "@/components/ui/store-location";

export const metadata: Metadata = {
  title: "Om PhoneSpot | Danmarks Specialist i Refurbished Tech",
  description:
    "PhoneSpot er Danmarks specialist i kvalitetstestede refurbished iPhones, iPads og bærbare. Lær os at kende — vores mission, værdier og løfter til dig.",
  alternates: {
    canonical: "https://phonespot.dk/om-os",
  },
  openGraph: {
    title: "Om PhoneSpot | Refurbished Tech med 36 Mdr. Garanti",
    description:
      "Vi giver premium elektronik nyt liv med 30+ kvalitetstests og 36 måneders garanti. Spar op til 40% og gør en forskel for miljøet.",
    url: "https://phonespot.dk/om-os",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STATS = [
  {
    value: "1.000+",
    label: "Enheder solgt",
    description: "Glade kunder over hele Danmark",
  },
  {
    value: "30+",
    label: "Kvalitetstests per enhed",
    description: "Grundig testproces på alt vi sælger",
  },
  {
    value: "36 mdr",
    label: "Garanti på alt",
    description: "Samme garanti som ved køb af nyt",
  },
  {
    value: "4.5/5",
    label: "Trustpilot score",
    description: "Baseret på ægte kundeanmeldelser",
  },
];

const COMMITMENTS = [
  {
    title: "Kvalitet uden kompromis",
    description:
      "Hver enhed gennemgår vores 30-punkts testproces. Skærm, batteri, kamera, sensorer — alt testes individuelt af uddannede teknikere. Enheder der ikke består, sælges ikke.",
    icon: "shield",
  },
  {
    title: "Ærlig gradering",
    description:
      "Vi pynter aldrig på standen. Vores Grade A, B og C system fortæller dig præcis hvad du kan forvente kosmetisk. Ingen ubehagelige overraskelser når pakken lander.",
    icon: "check",
  },
  {
    title: "Bæredygtigt valg",
    description:
      "Hvert refurbished produkt sparer op til 80% CO\u2082 sammenlignet med ny produktion. Vi forlænger enheders levetid og reducerer elektronisk affald — uden at du giver afkald på kvalitet.",
    icon: "leaf",
  },
  {
    title: "Dansk support — altid",
    description:
      "Vi er en dansk virksomhed med dansk kundeservice. Rigtige mennesker der svarer på dansk, typisk inden for 24 timer. Ingen chatbots, ingen ventetid i telefonen.",
    icon: "phone",
  },
  {
    title: "Tryg handel med e-mærket",
    description:
      "PhoneSpot er e-mærket godkendt. Det betyder at vi overholder alle danske regler for nethandel, forbrugerbeskyttelse og persondatasikkerhed. Du handler trygt — hver gang.",
    icon: "badge",
  },
  {
    title: "Hurtig levering",
    description:
      "Bestil i dag, modtag i morgen. Vi sender alle ordrer med hurtig levering på 1-2 hverdage. Og med 14 dages fuld fortrydelsesret kan du altid sende den retur.",
    icon: "truck",
  },
];

const TIMELINE = [
  {
    year: "Idéen",
    title: "En frustration blev til en forretning",
    description:
      "Vi oplevede selv hvor svært det var at finde refurbished elektronik i Danmark, man kunne stole på. Markedet var fyldt med usikre køb, manglende garanti og uærlige standbeskrivelser. Det ville vi lave om på.",
  },
  {
    year: "Missionen",
    title: "Kvalitet til en fair pris",
    description:
      "Vi satte os for at bygge Danmarks mest pålidelige platform for refurbished tech. Med professionelle kvalitetstests, ærlig gradering og en garanti der matcher køb af nyt. Ingen genveje.",
  },
  {
    year: "I dag",
    title: "1.000+ enheder og voksende",
    description:
      "I dag har vi solgt over 1.000 kvalitetstestede enheder til kunder over hele Danmark. Hver enhed har bestået vores 30-punkts testproces, og vi stopper ikke her. Udvalget vokser, kvaliteten forbliver.",
  },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function CheckIcon() {
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

function PhoneIcon() {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function BadgeIcon() {
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
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function TruckIcon() {
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
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  shield: <ShieldIcon />,
  check: <CheckIcon />,
  leaf: <LeafIcon />,
  phone: <PhoneIcon />,
  badge: <BadgeIcon />,
  truck: <TruckIcon />,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OmOsPage() {
  return (
    <>
      {/* ── Hero ── */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Om PhoneSpot
            </p>
            <Heading size="xl" className="text-white">
              Vi giver premium tech nyt liv
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              PhoneSpot er Danmarks specialist i refurbished elektronik. Vi
              tror på, at kvalitetsteknologi ikke behøver at koste en formue —
              og at det smarteste køb også er det mest bæredygtige. Hver enhed
              vi sælger, er testet, verificeret og dækket af 36 måneders
              garanti.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <span className="text-green-eco">✓</span> Dansk virksomhed
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-eco">✓</span> e-mærket godkendt
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-eco">✓</span> 36 mdr. garanti
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-eco">✓</span> 1.000+ enheder solgt
              </span>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Stats Bar ── */}
      <SectionWrapper background="sand">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-green-eco md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[1px] text-charcoal">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-gray">{stat.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Vores Historie ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Vores historie
            </p>
            <Heading as="h2" size="lg">
              Fra frustration til forretning
            </Heading>
            <p className="mt-6 text-lg leading-relaxed text-gray">
              PhoneSpot blev skabt af en simpel frustration: det var næsten
              umuligt at finde pålidelig refurbished elektronik i Danmark.
              Markedet var fyldt med usikre køb, misvisende standbeskrivelser
              og manglende garanti. Vi vidste, at det kunne gøres bedre — og
              det satte vi os for at bevise.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-gray">
              I dag er PhoneSpot Danmarks dedikerede specialist i
              kvalitetstestet refurbished tech. Vi har solgt over 1.000
              enheder, og hver eneste én har bestået vores grundige 30-punkts
              testproces. Vores mission er enkel: gøre premium teknologi
              tilgængelig for alle — med den tryghed og garanti du fortjener.
            </p>
          </FadeIn>
        </div>

        {/* Timeline */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="relative space-y-12 border-l-2 border-sand pl-8">
            {TIMELINE.map((item, i) => (
              <FadeIn key={item.year} delay={i * 0.15}>
                <div className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-green-eco bg-white">
                    <div className="h-2 w-2 rounded-full bg-green-eco" />
                  </div>
                  <p className="font-display text-xs font-bold uppercase tracking-[2px] text-green-eco">
                    {item.year}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-charcoal">
                    {item.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-gray">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ── Vores Løfter (Commitments) ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Vores løfter
            </p>
            <Heading as="h2" size="lg">
              Det vi står for — hver dag
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Hos PhoneSpot er vores værdier ikke bare ord på en side. De
              styrer alle beslutninger vi træffer — fra hvordan vi tester
              enheder, til hvordan vi håndterer garanti og support.
            </p>
          </FadeIn>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COMMITMENTS.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  {ICON_MAP[c.icon]}
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">
                  {c.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray">
                  {c.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Hvorfor Refurbished ── */}
      <SectionWrapper>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Bæredygtighed
              </p>
              <Heading as="h2" size="md">
                Refurbished er fremtiden — og vi er her for at bevise det
              </Heading>
              <p className="mt-4 text-gray leading-relaxed">
                Produktion af ny elektronik er en af verdens mest
                ressourcekrævende industrier. Sjældne mineraler skal udvindes,
                fabrikker kører for fuld kraft, og CO&#8322;-udledningen er
                enorm. Men det behøver ikke være sådan.
              </p>
              <p className="mt-3 text-gray leading-relaxed">
                Ved at vælge refurbished fra PhoneSpot forlænger du enhedens
                levetid med flere år, sparer op til 80% CO&#8322; og reducerer
                behovet for ny produktion. Du får den samme funktionalitet, den
                samme garanti — men med en brøkdel af miljøbelastningen.
              </p>
              <p className="mt-3 text-gray leading-relaxed">
                Det er et valg der giver mening for din pung, din samvittighed
                og vores planet. Og med PhoneSpots 36 måneders garanti risikerer
                du intet.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
                <p className="font-display text-3xl font-bold text-green-eco">
                  80%
                </p>
                <p className="mt-1 text-xs font-medium text-charcoal">
                  Mindre CO&#8322;-udledning
                </p>
                <p className="mt-1 text-xs text-gray">vs. ny produktion</p>
              </div>
              <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
                <p className="font-display text-3xl font-bold text-green-eco">
                  40%
                </p>
                <p className="mt-1 text-xs font-medium text-charcoal">
                  Lavere pris
                </p>
                <p className="mt-1 text-xs text-gray">
                  vs. at købe fabriksny
                </p>
              </div>
              <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
                <p className="font-display text-3xl font-bold text-green-eco">
                  2+ år
                </p>
                <p className="mt-1 text-xs font-medium text-charcoal">
                  Ekstra levetid
                </p>
                <p className="mt-1 text-xs text-gray">per refurbished enhed</p>
              </div>
              <div className="rounded-2xl bg-green-eco/5 p-6 text-center">
                <p className="font-display text-3xl font-bold text-green-eco">
                  100%
                </p>
                <p className="mt-1 text-xs font-medium text-charcoal">
                  Funktionalitet
                </p>
                <p className="mt-1 text-xs text-gray">
                  Alt virker som det skal
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Sådan arbejder vi ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Vores proces
            </p>
            <Heading as="h2" size="md" className="text-white">
              Fra indkøb til din dør — sådan arbejder vi
            </Heading>
            <p className="mt-4 text-white/60">
              Bag hvert produkt på PhoneSpot ligger en grundig proces der
              sikrer, at du får præcis det du forventer.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Indkøb",
              description:
                "Vi indkøber enheder fra certificerede, europæiske leverandører med fuld sporbarhed og dokumentation.",
            },
            {
              step: "02",
              title: "Test",
              description:
                "Hver enhed gennemgår vores 30-punkts testproces. Skærm, batteri, kamera, sensorer — alt verificeres.",
            },
            {
              step: "03",
              title: "Gradering",
              description:
                "Enheden graderes ærligt som A, B eller C baseret på kosmetisk stand. Vi pynter aldrig på sandheden.",
            },
            {
              step: "04",
              title: "Levering",
              description:
                "Enheden rengøres, pakkes omhyggeligt og sendes til dig med 1-2 hverdages levering og 36 mdr. garanti.",
            },
          ].map((item, i) => (
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
        <div className="mt-12 text-center">
          <Link
            href="/kvalitet"
            className="inline-block text-sm font-semibold text-green-eco hover:underline"
          >
            Læs mere om vores kvalitetsproces &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Tryghed & tillid ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Tryghed
            </p>
            <Heading as="h2" size="md">
              Derfor kan du handle trygt hos PhoneSpot
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Vi er ikke en anonym markedsplads. Vi er en dansk virksomhed der
              står bag hvert eneste produkt vi sælger. Her er hvad det betyder
              for dig.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "e-mærket godkendt",
              description:
                "Vi overholder alle danske regler for nethandel, forbrugerbeskyttelse og persondatasikkerhed. Dit køb er beskyttet.",
            },
            {
              title: "36 måneders garanti",
              description:
                "Samme garantiperiode som ved køb af nyt. Dækker fabrikationsfejl og funktionelle mangler. Vi håndterer alt.",
            },
            {
              title: "14 dages fortrydelsesret",
              description:
                "Ikke tilfreds? Returner enheden inden 14 dage og få dine penge tilbage. Ingen spørgsmål, ingen skjulte gebyrer.",
            },
            {
              title: "Sikker betaling",
              description:
                "Betal med kort, MobilePay eller bankoverførsel. Alle transaktioner er krypterede og sikre.",
            },
            {
              title: "Dansk kundeservice",
              description:
                "Rigtige mennesker der svarer på dansk. Typisk svar inden for 24 timer på hverdage. Vi er her for dig.",
            },
            {
              title: "Hurtig levering",
              description:
                "1-2 hverdages levering på alle ordrer. Vi pakker omhyggeligt og sender hurtigt, så du får din enhed snarest.",
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <div className="rounded-2xl border border-sand bg-white p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-eco text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">
                  {item.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Besøg os ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Fysisk butik
            </p>
            <Heading as="h2" size="md">
              Besøg os
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Vi har også en fysisk butik, hvor du kan se og prøve vores
              produkter. Kig forbi og få personlig rådgivning.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <StoreLocation variant="full" />
        </div>
      </SectionWrapper>

      {/* ── Trust bar ── */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>

      {/* ── Kontakt ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Kontakt
            </p>
            <Heading as="h2" size="md">
              Har du spørgsmål? Vi er klar
            </Heading>
            <p className="mt-4 text-lg text-gray">
              Uanset om du har spørgsmål til et produkt, brug for hjælp med
              en ordre eller bare vil vide mere om PhoneSpot — vi hører gerne
              fra dig.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Skriv til os &rarr;
              </Link>
              <Link
                href="/faq"
                className="inline-block rounded-full border-2 border-charcoal px-8 py-3 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
              >
                Se FAQ &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md" className="text-white">
              Klar til at finde din næste enhed?
            </Heading>
            <p className="mt-4 text-white/60">
              Udforsk vores udvalg af kvalitetstestede refurbished iPhones,
              iPads og bærbare. 36 måneders garanti og 14 dages fortrydelsesret
              på alt.
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
                className="inline-block rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
              >
                Se iPads &rarr;
              </Link>
              <Link
                href="/baerbare"
                className="inline-block rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-charcoal"
              >
                Se bærbare &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}
