import type { Metadata } from "next";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";
import { TrustBar } from "@/components/ui/trust-bar";
import { SellDeviceWizard } from "@/components/sell-device/sell-device-wizard";

export const metadata: Metadata = {
  title: "Sælg din brugte enhed | PhoneSpot",
  description:
    "Sælg din brugte iPhone, Samsung, iPad eller laptop til PhoneSpot. Fair pris, hurtig vurdering og betaling med det samme.",
  alternates: {
    canonical: "https://phonespot.dk/saelg-din-enhed",
  },
  openGraph: {
    title: "Sælg din brugte enhed | PhoneSpot",
    description:
      "Sælg din brugte iPhone, Samsung, iPad eller laptop til PhoneSpot. Fair pris, hurtig vurdering og betaling med det samme.",
    url: "https://phonespot.dk/saelg-din-enhed",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  );
}

function SearchCheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function BanknotesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const PROCESS_STEPS = [
  {
    step: "1",
    title: "Udfyld formular",
    description: "Fortæl os om din enhed og dens stand. Det tager kun 2 minutter.",
    icon: <ClipboardIcon className="h-7 w-7" />,
  },
  {
    step: "2",
    title: "Vi vurderer og kontakter dig",
    description: "Vi giver dig et fair tilbud inden for 24 timer baseret på markedsprisen.",
    icon: <SearchCheckIcon className="h-7 w-7" />,
  },
  {
    step: "3",
    title: "Aflevér og få betaling",
    description: "Kom forbi en af vores butikker. Vi klarer datasletning og betaler med det samme.",
    icon: <BanknotesIcon className="h-7 w-7" />,
  },
];

const USP_BADGES = [
  { label: "Fair markedspris", icon: "tag" },
  { label: "Hurtig vurdering", icon: "clock" },
  { label: "Vi klarer datasletning", icon: "shield" },
  { label: "Betaling ved aflevering", icon: "cash" },
];

function UspIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    tag: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    ),
    clock: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    shield: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    cash: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
}

export default function SaelgDinEnhedPage() {
  return (
    <>
      {/* -- Hero -- */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-4xl text-center">
          <FadeIn>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Sælg til PhoneSpot
            </p>
            <Heading size="xl" className="text-white">
              Sælg din brugte enhed til PhoneSpot
            </Heading>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Vi giver fair priser for brugte iPhones, Samsung-telefoner, iPads, laptops og smartwatches.
              Hurtig vurdering, sikker datasletning og betaling med det samme.
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* -- 3-step process -- */}
      <SectionWrapper>
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <div className="mb-10 text-center">
              <Heading as="h2" size="md">
                Sådan fungerer det
              </Heading>
            </div>
          </FadeIn>
          <div className="grid gap-8 md:grid-cols-3">
            {PROCESS_STEPS.map((item, i) => (
              <FadeIn key={item.step} delay={i * 0.1}>
                <div className="relative flex flex-col items-center rounded-2xl border border-soft-grey bg-white p-6 text-center shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                    {item.icon}
                  </div>
                  <span className="mb-2 inline-block rounded-full bg-green-eco px-3 py-1 text-xs font-bold text-white">
                    Trin {item.step}
                  </span>
                  <h3 className="font-display text-lg font-bold text-charcoal">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* -- USP badges -- */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {USP_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2">
                <span className="text-green-eco">
                  <UspIcon type={badge.icon} />
                </span>
                <span className="text-sm font-medium text-charcoal">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Form wizard -- */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <FadeIn>
              <Heading as="h2" size="md">
                Udfyld formularen
              </Heading>
              <p className="mt-4 text-gray">
                Det tager kun 2 minutter. Vi vender tilbage med et tilbud inden for 24 timer.
              </p>
            </FadeIn>
          </div>
          <SellDeviceWizard />
        </div>
      </SectionWrapper>

      {/* -- Trust section -- */}
      <SectionWrapper background="sand">
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
