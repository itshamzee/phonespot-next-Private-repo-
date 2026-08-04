import type { Metadata } from "next";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";
import { TrustBar } from "@/components/ui/trust-bar";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { STORES } from "@/lib/store-config";

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
    "sælg smadret iphone",
    "sælg defekt telefon",
    "opkøb iphone alle modeller",
    "sælg brugt samsung galaxy",
  ],
  alternates: {
    canonical: "https://phonespot.dk/saelg-din-enhed",
  },
  openGraph: {
    title: "Sælg din brugte enhed | Bedste pris & straksoverførsel | PhoneSpot",
    description:
      "Vi køber din brugte iPhone, Samsung, iPad eller laptop — uanset stand. Fair pris, gratis forsendelse og pengene med det samme.",
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
      {/* ── Hero — Clean light header ── */}
      <section className="bg-[#F7F7F8] border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1A3D2E]/20 bg-[#1A3D2E]/8 px-4 py-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#1A3D2E]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[#1A3D2E]">
                  Vi køber din enhed
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[0.95] text-[#111111] md:text-5xl lg:text-6xl">
                Sælg din brugte<br />
                <span className="italic text-[#1A3D2E]">elektronik</span> til os
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#86868B]">
                Vi køber din brugte elektronik — uanset stand. Den telefon der samler støv i skuffen?
                Der er penge i den. Udfyld formularen og få et tilbud inden for 24 timer.
              </p>

              {/* Personality callout */}
              <div className="mt-6 rounded-xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 px-5 py-4">
                <p className="font-display text-base font-bold text-[#1A3D2E]">
                  "Der er penge i skidtet — tag telefonen op af skuffen"
                </p>
                <p className="mt-1 text-sm text-[#6E6E73]">
                  Op til tusindvis af kroner for din gamle enhed. Vi køber alle mærker, alle stande.
                </p>
              </div>

              {/* Quick stats */}
              <div className="mt-10 flex flex-wrap gap-8">
                <div>
                  <p className="font-display text-3xl font-bold text-[#111111]">24t</p>
                  <p className="mt-1 text-xs font-medium text-[#86868B]">Tilbud inden for</p>
                </div>
                <div className="h-12 w-px bg-[#E5E5EA]" />
                <div>
                  <p className="font-display text-3xl font-bold text-[#111111]">Gratis</p>
                  <p className="mt-1 text-xs font-medium text-[#86868B]">Forsendelse</p>
                </div>
                <div className="h-12 w-px bg-[#E5E5EA]" />
                <div>
                  <p className="font-display text-3xl font-bold text-[#1A3D2E]">Straks</p>
                  <p className="mt-1 text-xs font-medium text-[#86868B]">Overførsel</p>
                </div>
              </div>
            </div>

            {/* Right: Hero image */}
            <div className="hidden lg:flex items-center justify-center">
              <img
                src="/images/sell-hero.png"
                alt="Sælg din brugte iPhone, iPad, Samsung, MacBook eller Apple Watch til PhoneSpot"
                className="w-full max-w-lg rounded-3xl object-cover shadow-lg shadow-black/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals bar ── */}
      <section className="bg-white border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "Straksoverførsel",
                desc: "Pengene på kontoen inden for 24 timer",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
                title: "Gratis forsendelse",
                desc: "Vi sender en pakkelabel til dig",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ),
                title: "Fair priser",
                desc: "Markedets bedste priser — altid",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                  </svg>
                ),
                title: "Fysisk butik",
                desc: "Aflever i Slagelse — penge med det samme",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
                  {item.icon}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-[#111111]">{item.title}</p>
                  <p className="text-xs text-[#6E6E73]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
              Sådan fungerer det
            </h2>
            <p className="mt-3 text-[#86868B]">3 nemme trin — fra formular til betaling</p>
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
                className="group relative rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-7 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md hover:shadow-[#1A3D2E]/5"
              >
                <div className="absolute -top-4 left-6">
                  <span className="font-display text-4xl font-bold italic text-[#1A3D2E]/15">
                    {item.step}
                  </span>
                </div>
                <div className="mb-4 mt-2 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A3D2E]/10 text-[#1A3D2E] transition-colors group-hover:bg-[#1A3D2E] group-hover:text-white">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl font-bold text-[#111111]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#86868B]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hvad køber vi? ── */}
      <section className="bg-[#F7F7F8] border-y border-[#E5E5EA]">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
              Alle mærker, alle stande
            </p>
            <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
              Hvad køber vi?
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-[#6E6E73]">
              Vi opkøber brugt elektronik af alle slags. Har du noget der samler støv?
              Vi giver et tilbud — uanset stand.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                img: "/images/devices/iphone-16-pro.png",
                title: "iPhones",
                subtitle: "Alle modeller, alle stande",
                detail: "iPhone 6 til iPhone 16 Pro Max — vi køber dem alle. Selv med smadret skærm.",
                badge: "Mest populære",
                badgeColor: "bg-[#1A3D2E] text-white",
              },
              {
                img: "/images/devices/samsung-galaxy-s.png",
                title: "Samsung Galaxy",
                subtitle: "S-serie, A-serie, Fold & Flip",
                detail: "Fra Galaxy A-serien til den nyeste S25 Ultra og Fold. Vi kender markedsprisen.",
                badge: null,
                badgeColor: "",
              },
              {
                img: "/images/devices/ipad-pro.png",
                title: "iPads & Tablets",
                subtitle: "iPad, Samsung Tab og andre",
                detail: "iPad Pro, Air, Mini, basic — samt Samsung Galaxy Tab og andre Android-tablets.",
                badge: null,
                badgeColor: "",
              },
              {
                img: "/images/devices/macbook-pro.png",
                title: "Bærbare computere",
                subtitle: "MacBook, ThinkPad, Dell, HP",
                detail: "MacBook Air og Pro sælger godt — men vi køber alle bærbare mærker.",
                badge: null,
                badgeColor: "",
              },
              {
                img: "/images/devices/apple-watch.png",
                title: "Smartwatches",
                subtitle: "Apple Watch, Samsung Watch",
                detail: "Apple Watch Series og Ultra, Samsung Galaxy Watch — og andre smartwatches.",
                badge: null,
                badgeColor: "",
              },
              {
                img: "/images/devices/iphone-12.png",
                title: "Smadrede enheder",
                subtitle: "Vi siger ja til defekte enheder",
                detail: "Smadret skærm, vandskade, batteri-problem? Intet problem — vi giver stadig et tilbud.",
                badge: "Vi siger aldrig nej",
                badgeColor: "bg-orange-100 text-orange-700",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative flex flex-col rounded-2xl border border-[#E5E5EA] bg-white p-6 transition-all hover:border-[#1A3D2E]/30 hover:shadow-md hover:shadow-[#1A3D2E]/5"
              >
                {item.badge && (
                  <div className="absolute -top-3 right-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                )}
                <div className="mb-4 flex h-20 w-20 items-center justify-center self-start rounded-2xl bg-[#F7F7F8]">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="h-16 w-16 object-contain transition-transform group-hover:scale-110"
                  />
                </div>
                <h3 className="font-display text-lg font-bold text-[#111111]">{item.title}</h3>
                <p className="mt-0.5 text-sm font-medium text-[#1A3D2E]">{item.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]">{item.detail}</p>
                <a
                  href="#start"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#1A3D2E] transition-all hover:gap-2.5"
                >
                  Få et tilbud
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-[#6E6E73]">
              Har du et andet mærke eller en model du ikke kan finde herover?{" "}
              <a href="#start" className="font-bold text-[#1A3D2E] underline-offset-2 hover:underline">
                Udfyld formularen — vi giver tilbud på alt.
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Wizard ── */}
      <section id="start" className="bg-white border-b border-[#E5E5EA]">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
              Få et tilbud på din enhed
            </h2>
            <p className="mt-3 text-[#86868B]">
              Udfyld formularen herunder — det tager kun 2 minutter
            </p>
          </div>
          <SellDeviceWizard />
        </div>
      </section>

      {/* ── Bæredygtighed ── */}
      <section className="bg-[#1A3D2E]">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.249 2.249 0 0 0 17.5 15.36m-6.634 1.39-.397 1.032a1.125 1.125 0 0 1-1.051.714H9m1.5-6.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wide text-white">
                  Bæredygtighed
                </span>
              </div>

              <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
                Giv din enhed nyt liv<br />
                <span className="italic opacity-80">— red miljøet</span>
              </h2>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75">
                Hvert år smides millioner af fungerende telefoner ud — eller glemmes i en skuffe.
                Når du sælger din enhed til os, forlænger vi dens levetid og sænker behovet for ny
                produktion. Produktionen af en ny smartphone udleder op til 70 kg CO₂.
                Genbrug reducerer det med op til 80%.
              </p>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
                Vores enheder sælges videre som refurbishede produkter med garanti —
                en cirkulær økonomi der er godt for både lommebok og klima.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#start"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-display text-sm font-bold text-[#1A3D2E] transition-all hover:brightness-95 hover:shadow-lg hover:shadow-black/20"
                >
                  Sælg din enhed nu
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  value: "80%",
                  label: "Mindre CO₂",
                  desc: "per enhed ved genbrug vs. nyproduktion",
                },
                {
                  value: "45 kg",
                  label: "CO₂ sparet",
                  desc: "per genbrugt smartphone i snit",
                },
                {
                  value: "1.000+",
                  label: "Enheder",
                  desc: "har fået nyt liv gennem PhoneSpot",
                },
                {
                  value: "0 kr",
                  label: "Ekstra for dig",
                  desc: "genbrug er bare den rigtige ting at gøre",
                },
              ].map((stat) => (
                <div
                  key={stat.value}
                  className="rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm"
                >
                  <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm font-bold text-white/90">{stat.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why sell to PhoneSpot ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
                Hvorfor sælge til PhoneSpot?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#86868B]">
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
                    desc: "Så snart vi modtager og verificerer din enhed, overfører vi pengene direkte til din konto. Ingen ventetid.",
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
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A3D2E]">
                      <svg viewBox="0 0 16 16" fill="white" className="h-3 w-3">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display font-bold text-[#111111]">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#86868B]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Store locations */}
            <div className="flex flex-col gap-4 lg:pl-8">
              <h3 className="font-display text-xl font-bold text-[#111111]">
                Aflever i butikken for hurtigere betaling
              </h3>
              <p className="text-sm text-[#86868B]">
                Vil du have pengene med det samme? Aflever din enhed i en af vores butikker
                og modtag betaling på stedet.
              </p>
              <div className="mt-2 space-y-4">
                {[STORES.slagelse, STORES.vejle].map((store) => (
                  <div key={store.slug} className="rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-6">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#1A3D2E]/10 px-3 py-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#1A3D2E]" />
                      <span className="text-xs font-bold text-[#1A3D2E]">Åben nu</span>
                    </div>
                    <p className="font-display text-lg font-bold text-[#111111]">{store.name}</p>
                    <p className="mt-1 text-sm text-[#86868B]">{store.street}, {store.zip} {store.city}</p>
                    <p className="mt-0.5 text-sm text-[#86868B]">
                      Man–Fre {store.hours.weekdays} · Lør–Søn {store.hours.saturday}
                    </p>
                  </div>
                ))}
              </div>

              <a
                href="#start"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#1A3D2E] px-6 py-4 font-display text-lg font-bold text-white transition-all hover:brightness-110 hover:shadow-lg hover:shadow-[#1A3D2E]/20"
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1A3D2E]">
            Sammenligning
          </p>
          <Heading as="h2" size="md">
            PhoneSpot vs. privatsalg
          </Heading>
          <p className="mt-4 text-base text-[#86868B]">
            Se hvorfor flere og flere vælger at sælge til os fremfor at sælge privat.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F7F7F8]">
                <th className="px-6 py-4 text-sm font-bold text-[#111111]"></th>
                <th className="px-6 py-4 text-center text-sm font-bold text-[#1A3D2E]">PhoneSpot</th>
                <th className="px-6 py-4 text-center text-sm font-bold text-[#111111]">Privatsalg (DBA/Facebook)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {[
                { feature: "Betaling", ps: "Straks ved aflevering", private: "Når køber betaler (dage/uger)" },
                { feature: "Forsendelse", ps: "Gratis — vi sender label", private: "Du betaler og pakker selv" },
                { feature: "Svindel-risiko", ps: "Ingen risiko", private: "Risiko for falske betalinger" },
                { feature: "Tidsforbrugt", ps: "2 minutter", private: "Annonce, beskeder, møder..." },
                { feature: "Datasletning", ps: "Professionel & certificeret", private: "Gør det selv (måske)" },
                { feature: "Defekte enheder", ps: "Ja — vi køber dem", private: "Svær at sælge videre" },
                { feature: "Pris", ps: "Fair markedspris", private: "Potentielt lidt højere" },
              ].map((row) => (
                <tr key={row.feature}>
                  <td className="px-6 py-4 text-sm font-semibold text-[#111111]">{row.feature}</td>
                  <td className="px-6 py-4 text-center text-sm text-[#111111]">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A3D2E]" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      {row.ps}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-[#86868B]">{row.private}</td>
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
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Dine data er i sikre hænder
            </h3>
            <p className="mt-3 text-base leading-relaxed text-[#86868B]">
              Alle enheder vi modtager gennemgår en professionel fabriksnulstilling. Vi sletter alt — fotos, apps, konti og personlige data. Du modtager bekræftelse når processen er gennemført.
            </p>
            <ul className="mt-4 space-y-2">
              {["Fuld fabriksnulstilling", "Certificeret datasletning", "Bekræftelse sendes til dig"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[#111111]">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-[#1A3D2E]" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Environment */}
          <div className="rounded-2xl border border-[#E5E5EA] bg-white p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3D2E]/10 text-[#1A3D2E]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-[#111111]">
              Godt for miljøet
            </h3>
            <p className="mt-3 text-base leading-relaxed text-[#86868B]">
              Når du sælger din enhed til os, forlænger du dens levetid og reducerer behovet for ny produktion. Hver genbrugt telefon sparer op til 45 kg CO₂ sammenlignet med at producere en ny.
            </p>
            <div className="mt-6 rounded-xl bg-[#1A3D2E]/5 p-4">
              <p className="text-center font-display text-2xl font-bold text-[#1A3D2E]">80% mindre CO₂</p>
              <p className="mt-1 text-center text-sm text-[#86868B]">per enhed ved genbrug vs. nyproduktion</p>
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
              <p className="text-base leading-relaxed text-[#111111]">&ldquo;{review.text}&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-bold text-[#111111]">{review.name}</p>
                <p className="text-xs text-[#86868B]">{review.location}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── SEO Long-form content ── */}
      <section className="bg-white border-y border-[#E5E5EA]">
        <div className="mx-auto max-w-4xl px-4 py-16 md:py-20">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-[#111111] md:text-4xl">
              Sælg din brugte enhed til PhoneSpot
            </h2>
            <p className="mt-3 text-[#6E6E73]">
              Vi opkøber brugt elektronik — her er alt du skal vide
            </p>
          </div>

          <div className="space-y-12 text-base leading-relaxed text-[#6E6E73]">

            {/* iPhone */}
            <div>
              <h3 className="mb-3 font-display text-xl font-bold text-[#111111]">
                Sælg din brugte iPhone — få den bedste pris
              </h3>
              <p>
                Har du en gammel iPhone der samler støv? Uanset om det er en iPhone 8, iPhone 11,
                iPhone 13 Pro eller den nyeste model — vi køber den. Vi giver fair priser baseret på
                aktuelle markedspriser, og du behøver ikke vente på en køber som ved privatsalg.
              </p>
              <p className="mt-3">
                Vi opkøber iPhones i alle stande. Smadret skærm? Dårligt batteri? Ingen Touch ID?
                Det er fint — vi justerer blot prisen og giver dig stadig et tilbud. Det eneste du
                skal gøre er at udfylde formularen herover, og så kontakter vi dig inden for 24 timer.
              </p>
              <p className="mt-3">
                Afleverer du din iPhone i vores butik i Slagelse, får du pengene med det samme via
                straksoverførsel direkte til din bankkonto. Ingen ventetid, ingen bøvl.
              </p>
            </div>

            {/* Samsung */}
            <div>
              <h3 className="mb-3 font-display text-xl font-bold text-[#111111]">
                Sælg din brugte Samsung Galaxy
              </h3>
              <p>
                Vi er store fans af Samsung-enheder og opkøber Galaxy S-serien, A-serien, Z Fold og
                Z Flip. Samsung-telefoner holder generelt godt, og de refurbishede modeller sælger
                godt — det betyder bedre priser til dig som sælger.
              </p>
              <p className="mt-3">
                Fra Galaxy S21 til S25 Ultra — vi kender markedspriserne og giver dig et konkurrencedygtigt
                tilbud. Har du en ældre Galaxy eller et A-serie model? Send os en forespørgsel — vi
                opkøber bredt og siger sjældent nej.
              </p>
            </div>

            {/* Laptop */}
            <div>
              <h3 className="mb-3 font-display text-xl font-bold text-[#111111]">
                Sælg din gamle laptop — MacBook, ThinkPad, Dell og mere
              </h3>
              <p>
                Brugte laptops er efterspurgte — særligt MacBook Air og MacBook Pro, som holder deres
                værdi godt i lang tid. Men vi opkøber også ThinkPad, Dell XPS, HP EliteBook og andre
                populære mærker.
              </p>
              <p className="mt-3">
                Laptops er tungere at sende, men vores gratis forsendelseslabel dækker det. Alternativt
                kan du aflevere direkte i butikken i Slagelse. Vi vurderer stand, specifikationer og
                markedspris — og sender dig et tilbud inden for 24 timer.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ (SEO) ── */}
      <section className="bg-[#F7F7F8]">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-[#111111]">
            Ofte stillede spørgsmål
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Hvad sker der med min enhed, når I modtager den?",
                a: "Når vi modtager din enhed, tjekker vi at den matcher beskrivelsen du opgav i formularen. Herefter gennemgår enheden en professionel fabriksnulstilling, så alle dine data slettes sikkert. Enheden rengøres og klargøres til videresalg som et refurbishet produkt — eller eventuel reservedelshøstning hvis den er for beskadiget til videresalg.",
              },
              {
                q: "Hvornår får jeg mine penge?",
                a: "Afleverer du i butikken, overfører vi pengene med det samme via straksoverførsel. Sender du enheden, overfører vi pengene inden for 24 timer efter vi har modtaget og verificeret den. Du modtager en bekræftelse på e-mail så snart overførslen er sendt.",
              },
              {
                q: "Køber I enheder med smadret skærm?",
                a: "Ja, det gør vi. En smadret skærm er en af de mest almindelige skader, og det stopper os ikke fra at give et tilbud. Prisen vil naturligvis afspejle skaden, men vi siger aldrig nej på grund af en beskadiget skærm. Det samme gælder vandskade, dårligt batteri eller andre defekter — bare vær ærlig i din beskrivelse.",
              },
              {
                q: "Hvilke enheder opkøber I?",
                a: "Vi opkøber brugte iPhones, Samsung-telefoner, iPads, tablets, laptops (MacBook, ThinkPad, HP m.fl.), smartwatches og meget mere. Vi accepterer de fleste mærker og modeller — udfyld formularen, så giver vi dig et tilbud.",
              },
              {
                q: "Hvad med mine data — er det sikkert?",
                a: "Vi sletter alle data professionelt fra din enhed. Du kan også selv nulstille den inden du sender den til os — det anbefaler vi faktisk. Vi sender en bekræftelse når datasletningen er gennemført fra vores side.",
              },
              {
                q: "Hvor lang tid tager det at få et tilbud?",
                a: "Vi sender typisk et tilbud inden for 24 timer efter du har udfyldt formularen. I travle perioder kan det tage op til 48 timer.",
              },
              {
                q: "Kan jeg aflevere i butikken i stedet for at sende?",
                a: "Ja! Du kan aflevere din enhed i vores butik i Slagelse og få betaling med det samme. Det er den hurtigste måde at sælge din enhed på — ingen ventetid, pengene er på kontoen øjeblikkeligt.",
              },
              {
                q: "Hvad hvis tilbuddet ikke matcher forventningerne?",
                a: "Intet problem — du er aldrig forpligtet til at acceptere vores tilbud. Afviser du det, sender vi naturligvis din enhed retur for vores regning, hvis vi allerede har modtaget den.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-[#E5E5EA] bg-white"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 font-display font-bold text-[#111111] transition-colors hover:text-[#1A3D2E] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5 shrink-0 text-[#86868B] transition-transform group-open:rotate-180"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-[#86868B]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="border-t border-[#E5E5EA] bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <TrustBar />
        </div>
      </section>
    </>
  );
}
