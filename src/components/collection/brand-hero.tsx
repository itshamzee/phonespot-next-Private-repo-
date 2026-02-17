import Link from "next/link";
import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";

type BrandHeroProps = {
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
};

export function BrandHero({ title, description, ctaText, ctaHref }: BrandHeroProps) {
  return (
    <section className="ps-pattern-diagonal py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <FadeIn>
          <Heading size="xl" className="text-white">{title}</Heading>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="mt-4 max-w-2xl text-lg text-white/70">{description}</p>
        </FadeIn>
        {ctaText && ctaHref && (
          <FadeIn delay={0.2}>
            <Link
              href={ctaHref}
              className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              {ctaText}
            </Link>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
