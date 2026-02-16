import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

export function Hero() {
  return (
    <section className="ps-pattern-diagonal relative overflow-hidden">
      {/* Diagonal repeating PHONESPOT wordmark overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div
          className="absolute whitespace-nowrap font-display text-[14px] font-extrabold italic uppercase tracking-[12px] text-white/[0.04]"
          style={{
            transform: "rotate(-30deg)",
            width: "300%",
            lineHeight: "3.5",
          }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i}>
              {"PHONESPOT ".repeat(30)}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center md:py-32">
        {/* Subtitle above logo */}
        <FadeIn>
          <p
            className="font-display text-[13px] font-semibold uppercase tracking-[8px] text-white/35"
          >
            Refurbished Tech &middot; Denmark
          </p>

          {/* Decorative line */}
          <div className="my-6 h-[2px] w-12 bg-sand" />
        </FadeIn>

        {/* Logo */}
        <FadeIn delay={0.15}>
          <img
            src="/brand/logos/phonespot-wordmark-white.svg"
            alt="PhoneSpot"
            className="w-80 md:w-96"
          />

          {/* Decorative line */}
          <div className="my-6 h-[2px] w-12 bg-sand" />
        </FadeIn>

        {/* Tagline */}
        <FadeIn delay={0.3}>
          <p className="max-w-md text-lg text-white/70">
            Premium tech uden premium pris. Kvalitetstestet med garanti.
          </p>
        </FadeIn>

        {/* CTA row */}
        <FadeIn delay={0.45}>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/iphones"
              className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Se produkter
            </Link>
            <Link
              href="#trust"
              className="rounded-full border border-white/20 px-8 py-3 font-semibold text-white transition-colors hover:border-white/40"
            >
              Hvorfor PhoneSpot?
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
