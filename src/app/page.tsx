import { Suspense } from "react";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FeaturedProducts } from "@/components/home/featured-products";
import { FadeIn } from "@/components/ui/fade-in";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: "iPhones",
    href: "/iphones",
    tagline: "Fra 999 kr",
    description: "Kvalitetstestede iPhones med 24 måneders garanti. Fra iPhone SE til 14 Pro Max.",
    span: "md:col-span-2 md:row-span-2",
    accent: true,
  },
  {
    name: "iPads",
    href: "/ipads",
    tagline: "Fra 899 kr",
    description: "iPad Air, iPad Pro og mere — testet og klar til brug.",
    span: "",
  },
  {
    name: "Bærbare",
    href: "/baerbare",
    tagline: "Fra 1.999 kr",
    description: "MacBook, ThinkPad og EliteBook med ren installation.",
    span: "",
  },
  {
    name: "Reservedele",
    href: "/reservedele",
    tagline: "Skærme & batterier",
    description: "Originale reservedele til iPhone, iPad og MacBook.",
    span: "",
  },
  {
    name: "Covers",
    href: "/covers",
    tagline: "Beskyt din enhed",
    description: "Covers, panserglas og tilbehør til alle modeller.",
    span: "",
  },
];

const USP_FEATURES = [
  {
    title: "Spar op til 40%",
    description: "Samme iPhone, samme funktioner — bare til en brøkdel af nyprisen.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: "30+ kvalitetstests",
    description: "Skærm, batteri, kamera, sensorer — alt testes individuelt af vores teknikere.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "24 måneders garanti",
    description: "Alle produkter leveres med fuld garanti. Har du problemer? Vi løser det.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "80% mindre CO₂",
    description: "Vælg refurbished og reducer dit klimaaftryk markant. Samme kvalitet, bedre samvittighed.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        <path d="M2 22c1.25-1.25 2.5-2 4-2 3 0 3 3 6 3s3-3 6-3c1.5 0 2.75.75 4 2" />
        <path d="M12 2v10" />
        <path d="m17 7-5-5-5 5" />
      </svg>
    ),
  },
];

const HOME_FAQ = [
  {
    question: "Hvad betyder refurbished?",
    answer:
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og istandsat. Hos PhoneSpot gennemgår alle enheder 30+ individuelle tests og leveres med 24 måneders garanti. Det er ikke det samme som \"brugt\" — det er kvalitetssikret teknologi.",
  },
  {
    question: "Hvad er forskellen på Grade A, B og C?",
    answer:
      "Alle grader er 100% funktionelle — forskellen er udelukkende kosmetisk. Grade A ser ud som ny, Grade B kan have lette brugsridser, og Grade C har synlige brugsspor men er det mest budgetvenlige valg.",
  },
  {
    question: "Kan jeg returnere min enhed?",
    answer:
      "Ja, du har 14 dages fuld returret. Er du ikke tilfreds, sender du enheden retur og får dine penge tilbage — ingen spørgsmål stillet.",
  },
  {
    question: "Hvor hurtigt leverer I?",
    answer:
      "Bestil før kl. 16 på hverdage, og vi sender samme dag. De fleste ordrer leveres inden for 1-2 hverdage med GLS eller PostNord.",
  },
  {
    question: "Er jeres iPhones ulåste?",
    answer:
      "Ja, alle vores iPhones er factory unlocked og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Subtle diagonal text overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div
            className="absolute whitespace-nowrap font-display text-[14px] font-extrabold italic uppercase tracking-[12px] text-white/[0.03]"
            style={{ transform: "rotate(-30deg)", width: "300%", lineHeight: "3.5" }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i}>{"PHONESPOT ".repeat(30)}</div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: text */}
            <div>
              <FadeIn>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
                  Refurbished tech · Danmark
                </p>
                <h1 className="font-display text-4xl font-extrabold italic leading-[1.1] text-white md:text-5xl lg:text-6xl">
                  Kvalitetstestet tech.
                  <br />
                  <span className="text-green-eco">Smart pris.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
                  iPhones, iPads og bærbare — alle testet med 30+ kontroller og
                  leveret med 24 måneders garanti. Spar op til 40% sammenlignet
                  med nypris.
                </p>
              </FadeIn>
              <FadeIn delay={0.2}>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/iphones"
                    className="rounded-full bg-green-eco px-8 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Se iPhones
                  </Link>
                  <Link
                    href="/baerbare"
                    className="rounded-full border border-white/20 px-8 py-3.5 font-semibold text-white transition-colors hover:border-white/40"
                  >
                    Se bærbare
                  </Link>
                </div>
              </FadeIn>
              <FadeIn delay={0.35}>
                <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/40">
                  <span className="flex items-center gap-2">
                    <span className="text-green-eco">✓</span> 24 mdr. garanti
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-green-eco">✓</span> e-mærket
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-green-eco">✓</span> 14 dages returret
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-green-eco">✓</span> 1-2 dages levering
                  </span>
                </div>
              </FadeIn>
            </div>

            {/* Right: featured price cards */}
            <FadeIn delay={0.15}>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/iphones" className="group rounded-3xl bg-white/[0.06] p-6 backdrop-blur-sm transition-all hover:bg-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-green-eco">iPhones</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">Fra 999 kr</p>
                  <p className="mt-1 text-xs text-white/40">iPhone SE til 14 Pro Max</p>
                </Link>
                <Link href="/ipads" className="group rounded-3xl bg-white/[0.06] p-6 backdrop-blur-sm transition-all hover:bg-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-green-eco">iPads</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">Fra 899 kr</p>
                  <p className="mt-1 text-xs text-white/40">iPad Air til iPad Pro</p>
                </Link>
                <Link href="/baerbare" className="group rounded-3xl bg-white/[0.06] p-6 backdrop-blur-sm transition-all hover:bg-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-green-eco">Bærbare</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">Fra 1.999 kr</p>
                  <p className="mt-1 text-xs text-white/40">MacBook, ThinkPad, EliteBook</p>
                </Link>
                <Link href="/outlet" className="group rounded-3xl bg-green-eco/20 p-6 backdrop-blur-sm transition-all hover:bg-green-eco/30">
                  <p className="text-xs font-semibold uppercase tracking-[2px] text-green-eco">Outlet</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">Ekstra tilbud</p>
                  <p className="mt-1 text-xs text-white/40">Spar endnu mere</p>
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-b border-sand bg-white py-4">
        <div className="mx-auto max-w-7xl px-4">
          <TrustBar />
        </div>
      </div>

      {/* ── Kategorier ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Udforsk vores udvalg
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alt er kvalitetstestet, rengjort og klar med 24 måneders garanti.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-4 md:grid-rows-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`group relative overflow-hidden rounded-3xl p-6 transition-all hover:shadow-lg ${
                cat.accent
                  ? "bg-green-eco text-white md:col-span-2 md:row-span-2 md:p-10"
                  : "bg-cream text-charcoal hover:bg-sand/60"
              } ${cat.span}`}
            >
              <div className="relative z-10">
                <p className={`text-xs font-semibold uppercase tracking-[2px] ${cat.accent ? "text-white/60" : "text-green-eco"}`}>
                  {cat.tagline}
                </p>
                <h3 className={`mt-2 font-display font-bold ${cat.accent ? "text-3xl md:text-4xl" : "text-xl"}`}>
                  {cat.name}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${cat.accent ? "max-w-sm text-white/70" : "text-gray"}`}>
                  {cat.description}
                </p>
                <span className={`mt-4 inline-block text-sm font-semibold transition-transform group-hover:translate-x-1 ${cat.accent ? "text-white" : "text-green-eco"}`}>
                  Se udvalg &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Featured Products ── */}
      <Suspense
        fallback={
          <div className="px-4 py-16 text-center text-gray">
            Indlæser produkter...
          </div>
        }
      >
        <FeaturedProducts />
      </Suspense>

      {/* ── Hvorfor PhoneSpot ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Hvorfor vælge os
          </p>
          <Heading as="h2" size="lg">
            Refurbished — men bedre end du tror
          </Heading>
          <p className="mt-4 text-lg text-gray">
            En refurbished enhed fra PhoneSpot er ikke bare billigere — den er
            grundigere testet end en fabriksny. Her er hvorfor tusindvis af
            danskere vælger os.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USP_FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.1}>
              <div className="rounded-3xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-eco/10 text-green-eco">
                  {feature.icon}
                </div>
                <h3 className="font-display text-base font-bold text-charcoal">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Kvalitetsløfte ── */}
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
              refurbished.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Professionel diagnostik med certificeret værktøj",
                "Ærlig gradering — A, B eller C, aldrig pyntet på",
                "Batterikapacitet altid oplyst og verificeret",
                "Ren software-installation og nyeste opdateringer",
                "Grundig rengøring og omhyggelig pakning",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-charcoal">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/kvalitet"
              className="mt-8 inline-block text-sm font-semibold text-green-eco hover:underline"
            >
              Læs mere om vores testproces &rarr;
            </Link>
          </div>

          {/* Grading preview */}
          <div className="space-y-4">
            {[
              { grade: "A", title: "Som ny", desc: "Ingen synlige brugstegn. Skærm og kabinet er fejlfrie.", color: "border-l-green-eco" },
              { grade: "B", title: "Meget god", desc: "Skærmen er perfekt. Kabinettet kan have lette brugsridser.", color: "border-l-green-light" },
              { grade: "C", title: "OK stand", desc: "Lette skærmridser og synlige brugsspor. Mest budgetvenlige valg.", color: "border-l-gray" },
            ].map((g) => (
              <div key={g.grade} className={`flex items-center gap-5 rounded-2xl border-l-4 ${g.color} bg-white p-5 shadow-sm`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal font-display text-lg font-bold text-white">
                  {g.grade}
                </div>
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-[1px] text-charcoal">{g.title}</p>
                  <p className="mt-0.5 text-sm text-gray">{g.desc}</p>
                </div>
              </div>
            ))}
            <Link
              href="/kvalitet"
              className="inline-block pl-1 text-sm font-semibold text-green-eco hover:underline"
            >
              Se detaljerede eksempler &rarr;
            </Link>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Stats ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "1.000+", label: "Enheder solgt" },
            { value: "30+", label: "Tests per enhed" },
            { value: "24", label: "Måneders garanti" },
            { value: "4.5/5", label: "På Trustpilot" },
          ].map((stat) => (
            <FadeIn key={stat.label}>
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-green-eco md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-white/60">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Newsletter / Promo Banner ── */}
      <SectionWrapper background="green" className="text-center text-white">
        <FadeIn>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-white/60">
            Nyhedsbrev
          </p>
          <Heading as="h2" size="lg" className="text-white">
            Få eksklusive tilbud direkte i indbakken
          </Heading>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Tilmeld dig vores nyhedsbrev og vær den første til at høre om nye
            produkter, tilbud og outlet-deals.
          </p>
          <form
            action="/api/newsletter"
            method="POST"
            className="mx-auto mt-8 flex max-w-md gap-3"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="Din email"
              className="flex-1 rounded-full bg-white/20 px-6 py-3 text-sm text-white placeholder:text-white/50 backdrop-blur-sm focus:bg-white/30 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-green-eco transition-opacity hover:opacity-90"
            >
              Tilmeld
            </button>
          </form>
        </FadeIn>
      </SectionWrapper>

      {/* ── Outlet teaser ── */}
      <SectionWrapper>
        <div className="overflow-hidden rounded-3xl bg-charcoal p-8 md:p-12 lg:p-16">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Outlet
              </p>
              <h2 className="font-display text-3xl font-extrabold italic text-white md:text-4xl">
                Spar ekstra på udvalgte produkter
              </h2>
              <p className="mt-4 max-w-lg text-white/60">
                Udvalgte produkter til ekstra skarpe priser. Samme kvalitet, samme
                24 måneders garanti — bare billigere. Begrænset antal.
              </p>
              <Link
                href="/outlet"
                className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Se outlet &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "iPhones", price: "Fra 999 kr" },
                { label: "iPads", price: "Fra 899 kr" },
                { label: "Bærbare", price: "Fra 1.999 kr" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/[0.06] p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[1px] text-green-eco">{item.label}</p>
                  <p className="mt-1 font-display text-sm font-bold text-white">{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── FAQ ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Ofte stillede spørgsmål
          </Heading>
          <p className="mt-4 text-gray">
            Har du spørgsmål om refurbished? Her er svarene.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-sand">
          {HOME_FAQ.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-semibold text-charcoal">
                {item.question}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray">{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/faq" className="text-sm font-semibold text-green-eco hover:underline">
            Se alle spørgsmål &rarr;
          </Link>
        </div>
      </SectionWrapper>

      {/* ── Final CTA ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <Heading as="h2" size="md">
            Klar til at finde din næste enhed?
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
