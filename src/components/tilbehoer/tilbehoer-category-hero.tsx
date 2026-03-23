"use client";

interface TilbehoerHeroProps {
  title: string;
  description?: string;
  productCount?: number;
}

export function TilbehoerCategoryHero({
  title,
  description,
  productCount,
}: TilbehoerHeroProps) {
  return (
    <section className="border-b border-sand bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-charcoal/60">
            {description}
          </p>
        )}
        {productCount != null && productCount > 0 && (
          <p className="mt-2 text-sm text-charcoal/40">
            {productCount} produkter
          </p>
        )}
      </div>
    </section>
  );
}
