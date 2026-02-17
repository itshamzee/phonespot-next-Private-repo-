import { Heading } from "@/components/ui/heading";
import { FadeIn } from "@/components/ui/fade-in";

type CategoryHeroProps = {
  title: string;
  description: string;
  badge?: string;
};

export function CategoryHero({ title, description, badge }: CategoryHeroProps) {
  return (
    <section className="bg-cream py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center">
        {badge && (
          <FadeIn>
            <span className="inline-block rounded-full bg-green-eco/10 px-4 py-1 text-sm font-medium text-green-eco">
              {badge}
            </span>
          </FadeIn>
        )}
        <FadeIn delay={0.1}>
          <Heading size="xl" className="mt-4">{title}</Heading>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-charcoal/70">{description}</p>
        </FadeIn>
      </div>
    </section>
  );
}
