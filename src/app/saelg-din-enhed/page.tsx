import type { Metadata } from "next";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { TrustBar } from "@/components/ui/trust-bar";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";

export const metadata: Metadata = {
  title: "Sælg din brugte telefon, tablet eller laptop | Bedste pris | PhoneSpot",
  description:
    "Sælg din brugte iPhone, Samsung, iPad, MacBook eller laptop til PhoneSpot. Vi giver Danmarks bedste priser, gratis forsendelse og straksoverførsel. Få et tilbud på 2 minutter.",
  keywords: [
    "sælg brugt iphone",
    "sælg brugt samsung",
    "sælg brugt ipad",
    "sælg brugt laptop",
    "sælg brugt macbook",
    "opkøb af brugt elektronik",
    "sælg din telefon",
    "bedste pris brugt telefon",
    "sælg brugt smartphone",
    "phonespot opkøb",
  ],
  alternates: {
    canonical: "https://phonespot.dk/saelg-din-enhed",
  },
  openGraph: {
    title: "Sælg din brugte enhed | Bedste pris & straksoverførsel | PhoneSpot",
    description:
      "Vi køber din brugte iPhone, Samsung, iPad eller laptop. Fair pris, gratis forsendelse og pengene med det samme.",
    url: "https://phonespot.dk/saelg-din-enhed",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SaelgDinEnhedPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[url('/patterns/plus.svg')] opacity-[0.03]" />

        {/* Green accent glow */}
        <div className="absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-green-eco/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-eco/30 bg-green-eco/10 px-4 py-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-eco" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-eco">
                  Vi køber din enhed
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[0.95] text-white md:text-5xl lg:text-6xl">
                Sælg din brugte<br />
                <span className="italic text-green-eco">elektronik</span> til os
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
                Vi opkøber brugte iPhones, Samsung-telefoner, iPads, laptops og mere.
                Du får et tilbud inden for 24 timer — og pengene med det samme.
              </p>

              {/* Quick stats */}
              <div className="mt-10 flex flex-wrap gap-8">
                <div>
                  <p className="font-display text-3xl font-bold text-white">24t</p>
                  <p className="mt-1 text-xs font-medium text-white/40">Tilbud inden for</p>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div>
                  <p className="font-display text-3xl font-bold text-white">Gratis</p>
                  <p className="mt-1 text-xs font-medium text-white/40">Forsendelse</p>
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div>
                  <p className="font-display text-3xl font-bold text-green-eco">Straks</p>
                  <p className="mt-1 text-xs font-medium text-white/40">Overførsel</p>
                </div>
              </div>
            </div>

            {/* Right: Hero image */}
            <div className="hidden lg:flex items-center justify-center">
              <img
                src="/images/sell-hero.png"
                alt="Sælg din brugte iPhone, iPad, Samsung, MacBook eller Apple Watch til PhoneSpot"
                className="w-full max-w-lg rounded-3xl object-cover shadow-2xl shadow-black/30"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-charcoal md:text-4xl">
              Sådan fungerer det
            </h2>
            <p className="mt-3 text-gray">3 nemme trin — fra formular til betaling</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Beskriv din enhed",
                desc: "Vælg type, model og beskriv standen. Tager kun 2 minutter.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Modtag tilbud",
                desc: "Vi vurderer din enhed og sender et fair tilbud inden for 24 timer.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Send eller aflever",
                desc: "Vælg gratis forsendelseslabel eller aflever i Slagelse/Vejle — og få pengene med det samme.",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-sand bg-warm-white p-7 transition-all hover:border-green-eco/30 hover:shadow-lg hover:shadow-green-eco/5"
              >
                <div className="absolute -top-4 left-6">
                  <span className="font-display text-4xl font-bold italic text-green-eco/20">
                    {item.step}
                  </span>
                </div>
                <div className="mb-4 mt-2 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco transition-colors group-hover:bg-green-eco group-hover:text-white">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl font-bold text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wizard ── */}
      <section id="start" className="bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-charcoal md:text-4xl">
              Få et tilbud på din enhed
            </h2>
            <p className="mt-3 text-gray">
              Udfyld formularen herunder — det tager kun 2 minutter
            </p>
          </div>
          <SellDeviceWizard />
        </div>
      </section>

      {/* ── Why sell to PhoneSpot (SEO section) ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold text-charcoal md:text-4xl">
                Hvorfor sælge til PhoneSpot?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray">
                Vi gør det nemt at sælge din brugte elektronik. Ingen stress, ingen skjulte
                gebyrer — bare en fair pris og hurtig betaling.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  {
                    title: "Fair markedspris",
                    desc: "Vi baserer vores tilbud på aktuelle markedspriser, så du altid får en konkurrencedygtig pris for din enhed.",
                  },
                  {
                    title: "Gratis forsendelse med label",
                    desc: "Acceptér tilbuddet og modtag et gratis forsendelseslabel. Pak din enhed og send den — vi betaler fragten.",
                  },
                  {
                    title: "Straksoverførsel ved modtagelse",
                    desc: "Så snart vi modtager og verificerer din enhed, overfører vi pengene direkte til din konto.",
                  },
                  {
                    title: "Hurtigere betaling i butikken",
                    desc: "Aflever din enhed i vores butik i Slagelse eller Vejle og få pengene med det samme — ingen ventetid.",
                  },
                  {
                    title: "Sikker datasletning",
                    desc: "Vi sletter alle data professionelt fra din enhed, så du kan sælge med ro i sindet.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco">
                      <svg viewBox="0 0 16 16" fill="white" className="h-3 w-3">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display font-bold text-charcoal">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Store locations */}
            <div className="flex flex-col gap-4 lg:pl-8">
              <h3 className="font-display text-xl font-bold text-charcoal">
                Aflever i butikken for hurtigere betaling
              </h3>
              <p className="text-sm text-gray">
                Vil du have pengene med det samme? Aflever din enhed i en af vores butikker
                og modtag betaling på stedet.
              </p>
              <div className="mt-2 space-y-4">
                <div className="rounded-2xl border border-sand bg-warm-white p-6">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-eco/10 px-3 py-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-eco" />
                    <span className="text-xs font-bold text-green-eco">Åben nu</span>
                  </div>
                  <p className="font-display text-lg font-bold text-charcoal">PhoneSpot Slagelse</p>
                  <p className="mt-1 text-sm text-gray">Vestsjællandscentret 10A, 103, 4200 Slagelse</p>
                  <p className="mt-0.5 text-sm text-gray">Man-Fre 10-17:30 · Lør 10-14</p>
                </div>
                <div className="rounded-2xl border border-sand bg-warm-white p-6">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-blue-600">Åbner snart</span>
                  </div>
                  <p className="font-display text-lg font-bold text-charcoal">PhoneSpot Vejle</p>
                  <p className="mt-1 text-sm text-gray">Adresse oplyses snart</p>
                  <p className="mt-0.5 text-sm text-gray">Åbner april 2026</p>
                </div>
              </div>

              <a
                href="#start"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-4 font-display text-lg font-bold text-white transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/25"
              >
                Få et tilbud nu
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sammenligning ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            Sammenligning
          </p>
          <Heading as="h2" size="md">
            PhoneSpot vs. privatsalg
          </Heading>
          <p className="mt-4 text-base text-gray">
            Se hvorfor flere og flere vælger at sælge til os fremfor at sælge privat.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-soft-grey bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-soft-grey bg-cream">
                <th className="px-6 py-4 text-sm font-bold text-charcoal"></th>
                <th className="px-6 py-4 text-center text-sm font-bold text-green-eco">PhoneSpot</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-charcoal">Privatsalg (DBA/Facebook)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-grey">
              {[
                { feature: "Betaling", ps: "Straks ved aflevering", private: "Når køber betaler (dage/uger)" },
                { feature: "Forsendelse", ps: "Gratis — vi sender label", private: "Du betaler og pakker selv" },
                { feature: "Svindel-risiko", ps: "Ingen risiko", private: "Risiko for falske betalinger" },
                { feature: "Tidsforbrugt", ps: "2 minutter", private: "Annonce, beskeder, møder..." },
                { feature: "Datasletning", ps: "Professionel & certificeret", private: "Gør det selv (måske)" },
                { feature: "Pris", ps: "Fair markedspris", private: "Potentielt lidt højere" },
              ].map((row) => (
                <tr key={row.feature}>
                  <td className="px-6 py-4 text-sm font-semibold text-charcoal">{row.feature}</td>
                  <td className="px-6 py-4 text-center text-sm text-charcoal">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-green-eco" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      {row.ps}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray">{row.private}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionWrapper>

      {/* ── Datasikkerhed & Miljø ── */}
      <SectionWrapper>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {/* Data security */}
          <div className="rounded-2xl border border-soft-grey bg-white p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-eco/10 text-green-eco">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-charcoal">
              Dine data er i sikre hænder
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray">
              Alle enheder vi modtager gennemgår en professionel fabriksnulstilling. Vi sletter alt — fotos, apps, konti og personlige data. Du modtager bekræftelse når processen er gennemført.
            </p>
            <ul className="mt-4 space-y-2">
              {["Fuld fabriksnulstilling", "Certificeret datasletning", "Bekræftelse sendes til dig"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-charcoal">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-green-eco" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Environment */}
          <div className="rounded-2xl border border-soft-grey bg-white p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-eco/10 text-green-eco">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-charcoal">
              Godt for miljøet
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray">
              Når du sælger din enhed til os, forlænger du dens levetid og reducerer behovet for ny produktion. Hver genbrugt telefon sparer op til 45 kg CO₂ sammenlignet med at producere en ny.
            </p>
            <div className="mt-6 rounded-xl bg-green-eco/5 p-4">
              <p className="text-center font-display text-2xl font-bold text-green-eco">80% mindre CO₂</p>
              <p className="mt-1 text-center text-sm text-gray">per enhed ved genbrug vs. nyproduktion</p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Kundeanmeldelser ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <Heading as="h2" size="md">
            Andre der har solgt til os
          </Heading>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              name: "Peter H.",
              location: "Roskilde",
              text: "Fik et fair tilbud på min gamle iPhone 12 Pro inden for 24 timer. Sendte den gratis og havde pengene på kontoen 2 dage efter.",
            },
            {
              name: "Camilla S.",
              location: "Slagelse",
              text: "Afleverede min Samsung i butikken og fik pengene med det samme. Super nemt og hurtigt — ingen bøvl som ved privatsalg.",
            },
            {
              name: "Mikkel R.",
              location: "Vejle",
              text: "Solgte 3 gamle telefoner på én gang. God pris på dem alle, og jeg behøvede ikke bekymre mig om datasletning. Anbefales!",
            },
          ].map((review) => (
            <div key={review.name} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 fill-[#00b67a]" aria-hidden="true">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="text-base leading-relaxed text-charcoal">&ldquo;{review.text}&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-bold text-charcoal">{review.name}</p>
                <p className="text-xs text-gray">{review.location}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── FAQ (SEO) ── */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-charcoal">
            Ofte stillede spørgsmål
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Hvilke enheder opkøber I?",
                a: "Vi opkøber brugte iPhones, Samsung-telefoner, iPads, tablets, laptops (MacBook, ThinkPad, HP m.fl.) og smartwatches. Vi accepterer de fleste mærker og modeller — udfyld formularen, så giver vi dig et tilbud.",
              },
              {
                q: "Hvordan får jeg mine penge?",
                a: "Afleverer du i butikken, får du pengene med det samme via straksoverførsel. Sender du enheden med vores gratis label, overfører vi pengene, så snart vi har modtaget og verificeret din enhed.",
              },
              {
                q: "Hvad med mine data?",
                a: "Vi sletter alle data professionelt fra din enhed. Du kan også selv nulstille den inden du sender den til os.",
              },
              {
                q: "Hvad hvis min enhed er i dårlig stand?",
                a: "Vi køber enheder i alle stande — fra perfekt til defekt. Prisen afhænger naturligvis af standen, men vi giver altid et fair tilbud.",
              },
              {
                q: "Hvor lang tid tager det at få et tilbud?",
                a: "Vi sender typisk et tilbud inden for 24 timer efter du har udfyldt formularen. I travle perioder kan det tage op til 48 timer.",
              },
              {
                q: "Kan jeg aflevere i butikken i stedet for at sende?",
                a: "Ja! Du kan aflevere din enhed i vores butik i Slagelse eller Vejle og få betaling med det samme. Det er den hurtigste måde at sælge din enhed på.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-sand bg-white"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-display font-bold text-charcoal transition-colors hover:text-green-eco [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5 shrink-0 text-gray transition-transform group-open:rotate-180"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-gray">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="bg-sand/40">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <TrustBar />
        </div>
      </section>
    </>
  );
}
