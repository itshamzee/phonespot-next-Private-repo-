import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Om os - PhoneSpot | Danmarks refurbished tech specialist",
  description:
    "Lær PhoneSpot at kende. Vi sælger kvalitetstestede iPhones, iPads og computere med garanti.",
};

const stats = [
  { value: "1000+", label: "Enheder solgt" },
  { value: "4.5/5", label: "Trustpilot score" },
  { value: "24 mdr", label: "Garanti på alt" },
  { value: "14 dage", label: "Fuld returret" },
];

const values = [
  {
    title: "Kvalitet først",
    body: "Vi tester alt — ingen genveje. Batteri, skærm, kamera, højttalere — det hele.",
  },
  {
    title: "Bæredygtighed",
    body: "Hvert refurbished produkt sparer op til 80% CO\u2082 sammenlignet med nyt.",
  },
  {
    title: "Dansk service",
    body: "Dansk support, hurtig levering og nem returret. Vi er her for dig.",
  },
];

export default function OmOsPage() {
  return (
    <>
      {/* Hero */}
      <SectionWrapper background="charcoal">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <Heading size="xl" className="text-white">
              Vi er PhoneSpot
            </Heading>
            <p className="mt-6 text-lg text-white/70">
              Danmarks specialist i kvalitetstestet refurbished tech
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* Mission */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <FadeIn>
            <Heading as="h2" size="md">
              Vores mission
            </Heading>
            <p className="mt-6 leading-relaxed text-charcoal/80">
              Vi tror på, at premium teknologi ikke behøver at koste en formue.
              Ved at give elektronik nyt liv reducerer vi e-affald og gør
              kvalitetsprodukter tilgængelige for alle.
            </p>
            <p className="mt-4 leading-relaxed text-charcoal/80">
              Hver enhed, der passerer gennem vores hænder, gennemgår en grundig
              kvalitetstest — fordi du fortjener produkter, du kan stole på.
            </p>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* Numbers strip */}
      <SectionWrapper background="sand">
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <p className="font-display text-3xl font-bold text-green-eco md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-gray">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* Values */}
      <SectionWrapper>
        <FadeIn>
          <Heading as="h2" size="md">
            Det vi står for
          </Heading>
        </FadeIn>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <FadeIn key={v.title} delay={i * 0.1}>
              <div className="rounded-radius-lg border border-sand bg-white p-6">
                <h3 className="font-display text-xl font-bold">{v.title}</h3>
                <p className="mt-2 text-charcoal/80">{v.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* Trust bar */}
      <SectionWrapper>
        <TrustBar />
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md">
              Klar til at finde din næste enhed?
            </Heading>
            <Link
              href="/iphones"
              className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se vores udvalg &rarr;
            </Link>
          </FadeIn>
        </div>
      </SectionWrapper>
    </>
  );
}
