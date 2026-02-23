import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FeaturedProducts } from "@/components/home/featured-products";
import { FadeIn } from "@/components/ui/fade-in";
import { GradeSlider } from "@/components/home/grade-slider";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: "iPhones",
    href: "/iphones",
    tagline: "Fra 999 kr",
    description: "Kvalitetstestede iPhones med 36 måneders garanti. Fra iPhone SE til 14 Pro Max.",
    span: "md:col-span-2 md:row-span-2",
    accent: true,
    image: "/categories/iphone.png",
  },
  {
    name: "iPads",
    href: "/ipads",
    tagline: "Fra 899 kr",
    description: "iPad Air, iPad Pro og mere — testet og klar til brug.",
    span: "",
    image: "/categories/ipad.png",
  },
  {
    name: "Bærbare",
    href: "/baerbare",
    tagline: "Fra 1.999 kr",
    description: "MacBook, ThinkPad og EliteBook med ren installation.",
    span: "",
    image: null,
  },
  {
    name: "Reservedele",
    href: "/reservedele",
    tagline: "Skærme & batterier",
    description: "Originale reservedele til iPhone, iPad og MacBook.",
    span: "",
    image: null,
  },
  {
    name: "Covers",
    href: "/covers",
    tagline: "Beskyt din enhed",
    description: "Covers, panserglas og tilbehør til alle modeller.",
    span: "",
    image: "/categories/covers.png",
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
    title: "36 måneders garanti",
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
      "Refurbished betyder, at enheden er professionelt inspiceret, testet og istandsat. Hos PhoneSpot gennemgår alle enheder 30+ individuelle tests og leveres med 36 måneders garanti. Det er ikke det samme som \"brugt\" — det er kvalitetssikret teknologi.",
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
      <section className="relative min-h-[520px] overflow-hidden bg-charcoal md:min-h-[600px] lg:min-h-[650px]">
        {/* Full-bleed background image */}
        <Image
          src="/hero-devices.png"
          alt=""
          fill
          priority
          className="object-contain object-center md:object-center lg:object-center"
          sizes="100vw"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/70 to-transparent" />

        {/* Content */}
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 md:min-h-[600px] lg:min-h-[700px]">
          <div className="max-w-xl py-20 md:py-28">
            <FadeIn>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
                Refurbished tech · Danmark
              </p>
              <h1 className="font-display text-4xl font-extrabold italic leading-[1.1] text-white md:text-5xl lg:text-6xl">
                Kvalitetstestet tech.
                <br />
                <span className="text-green-eco">Smart pris.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
                iPhones, iPads og bærbare — alle testet med 30+ kontroller og
                leveret med 36 måneders garanti. Spar op til 40% sammenlignet
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
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/50">
                <span className="flex items-center gap-2">
                  <span className="text-green-eco">✓</span> 36 mdr. garanti
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
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-b border-sand bg-white py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-4 md:gap-10">
          {/* Trustpilot */}
          <a
            href="https://dk.trustpilot.com/review/phonespot.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#00b67a]" fill="currentColor" aria-hidden="true">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-bold text-charcoal">Trustpilot</span>
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4].map((i) => (
                    <svg key={i} viewBox="0 0 24 24" className="h-3 w-3 text-[#00b67a]" fill="currentColor" aria-hidden="true">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                  <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                    <defs>
                      <linearGradient id="half-star">
                        <stop offset="40%" stopColor="#00b67a" />
                        <stop offset="40%" stopColor="#dcdce6" />
                      </linearGradient>
                    </defs>
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="url(#half-star)" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-charcoal">4.4</span>
              </div>
            </div>
          </a>

          <span className="hidden h-6 w-px bg-sand md:block" aria-hidden="true" />

          {/* e-mærket */}
          <a
            href="https://www.emaerket.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image src="/emaerket.png" alt="e-mærket certificeret" width={28} height={28} className="h-7 w-7" />
            <span className="text-sm font-medium text-charcoal">e-mærket</span>
          </a>

          <span className="hidden h-6 w-px bg-sand md:block" aria-hidden="true" />

          {/* Garanti */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span className="text-sm font-medium text-charcoal">36 mdr. garanti</span>
          </div>

          <span className="hidden h-6 w-px bg-sand md:block" aria-hidden="true" />

          {/* Returret */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            <span className="text-sm font-medium text-charcoal">14 dages returret</span>
          </div>

          <span className="hidden h-6 w-px bg-sand md:block" aria-hidden="true" />

          {/* Levering */}
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            <span className="text-sm font-medium text-charcoal">1-2 dages levering</span>
          </div>
        </div>
      </div>

      {/* ── Kategorier ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="lg">
            Udforsk vores udvalg
          </Heading>
          <p className="mt-4 text-lg text-gray">
            Alt er kvalitetstestet, rengjort og klar med 36 måneders garanti.
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
              <div className="relative z-10 flex h-full flex-col">
                <p className={`text-xs font-semibold uppercase tracking-[2px] ${cat.accent ? "text-white/60" : "text-green-eco"}`}>
                  {cat.tagline}
                </p>
                <h3 className={`mt-2 font-display font-bold ${cat.accent ? "text-3xl md:text-4xl" : "text-xl"}`}>
                  {cat.name}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${cat.accent ? "max-w-xs text-white/70" : "text-gray"}`}>
                  {cat.description}
                </p>
                {cat.accent ? (
                  <>
                    <span className="mt-6 inline-block w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-green-eco transition-transform group-hover:scale-105">
                      Se udvalg &rarr;
                    </span>
                    <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-6 text-xs text-white/50">
                      <span>✓ 36 mdr. garanti</span>
                      <span>✓ 30+ tests</span>
                      <span>✓ Spar op til 40%</span>
                      <span>✓ 14 dages returret</span>
                    </div>
                  </>
                ) : (
                  <span className={`mt-4 inline-block text-sm font-semibold transition-transform group-hover:translate-x-1 text-green-eco`}>
                    Se udvalg &rarr;
                  </span>
                )}
              </div>
              {cat.image && (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={cat.accent ? 800 : 200}
                  height={cat.accent ? 1060 : 200}
                  className={
                    cat.accent
                      ? "absolute inset-y-0 -right-12 z-0 my-auto h-[200%] w-[55%] object-contain object-right opacity-95 transition-transform duration-300 group-hover:scale-105"
                      : "absolute inset-y-0 right-0 z-0 my-auto h-[120%] w-1/2 object-contain object-right opacity-25 transition-transform duration-300 group-hover:scale-110"
                  }
                />
              )}
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

          {/* Grading slider */}
          <div>
            <GradeSlider />
            <div className="mt-4 text-center">
              <Link
                href="/kvalitet"
                className="inline-block text-sm font-semibold text-green-eco hover:underline"
              >
                Se detaljerede eksempler &rarr;
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Stats ── */}
      <SectionWrapper background="charcoal" className="text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { value: "1.000+", label: "Enheder solgt" },
            { value: "30+", label: "Tests per enhed" },
            { value: "36", label: "Måneders garanti" },
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
        <div className="relative overflow-hidden rounded-3xl bg-charcoal p-8 md:p-12 lg:p-16">
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
                Outlet
              </p>
              <h2 className="font-display text-3xl font-extrabold italic text-white md:text-4xl">
                Spar ekstra på udvalgte produkter
              </h2>
              <p className="mt-4 max-w-lg text-white/60">
                Udvalgte produkter til ekstra skarpe priser. Samme kvalitet, samme
                36 måneders garanti — bare billigere. Begrænset antal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  { text: "Op til 40% rabat", accent: true },
                  { text: "Samme garanti", accent: false },
                  { text: "Begrænset antal", accent: false },
                ].map((tag) => (
                  <span
                    key={tag.text}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      tag.accent
                        ? "bg-green-eco text-white"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {tag.text}
                  </span>
                ))}
              </div>
              <Link
                href="/outlet"
                className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Se outlet &rarr;
              </Link>
            </div>
            <div className="relative">
              <Image
                src="/outlet-banner.png"
                alt="MacBook, iPad og iPhone — outlet tilbud"
                width={600}
                height={325}
                className="w-full object-contain drop-shadow-2xl"
              />
              {/* Discount badges */}
              <div className="absolute -right-2 -top-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-eco font-display text-lg font-bold text-white shadow-lg md:h-20 md:w-20 md:text-xl">
                -40%
              </div>
              <div className="absolute -left-2 bottom-4 flex h-14 w-14 items-center justify-center rounded-full bg-white font-display text-base font-bold text-green-eco shadow-lg md:h-16 md:w-16 md:text-lg">
                -25%
              </div>
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
            Udforsk vores udvalg af kvalitetstestede enheder med 36 måneders
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
