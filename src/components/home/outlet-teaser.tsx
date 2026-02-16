import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

export function OutletTeaser() {
  return (
    <section className="relative overflow-hidden bg-charcoal py-20 md:py-28">
      {/* Large P watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          className="select-none font-display font-extrabold italic text-white/[0.03]"
          style={{ fontSize: "280px", lineHeight: 1 }}
        >
          P
        </span>
      </div>

      <FadeIn className="relative mx-auto max-w-3xl px-4 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-[6px] text-green-eco">
          Outlet
        </p>
        <h2 className="mt-4 font-display text-3xl font-bold italic text-white md:text-4xl">
          Spar ekstra p&aring; udvalgte produkter
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          Udvalgte produkter til ekstra skarpe priser. Samme kvalitet, samme
          garanti &mdash; bare billigere.
        </p>
        <Link
          href="/outlet"
          className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Se outlet &rarr;
        </Link>
      </FadeIn>
    </section>
  );
}
