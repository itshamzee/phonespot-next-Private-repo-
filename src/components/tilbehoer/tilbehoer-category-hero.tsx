"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface TilbehoerHeroProps {
  title: string;
  description?: string;
  productCount?: number;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <circle cx="8.5" cy="8.5" r="5" strokeLinecap="round" />
      <path strokeLinecap="round" d="M13 13l3.5 3.5" />
    </svg>
  );
}

function HeroInner({ title, description, productCount }: TilbehoerHeroProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSearch = searchParams.get("search") ?? "";

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("side");
      if (val) {
        params.set("search", val);
      } else {
        params.delete("search");
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <section
      className="relative border-b border-sand overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #F7F7F8 0%, #F0F0EC 40%, #EDEDEA 100%)",
      }}
    >
      {/* Subtle diagonal line texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #111111 0px, #111111 1px, transparent 1px, transparent 12px)",
        }}
      />

      {/* Green-eco accent line at top */}
      <div className="absolute left-0 top-0 h-0.5 w-24 bg-gradient-to-r from-green-eco to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 md:py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          {/* Left: title + description */}
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-charcoal/55 md:text-base">
                {description}
              </p>
            )}
            {productCount != null && productCount > 0 && (
              <p className="mt-3 inline-flex items-center rounded-full border border-sand bg-white/80 px-3 py-1 text-xs font-semibold text-charcoal/50 shadow-sm">
                {productCount} produkter
              </p>
            )}
          </div>

          {/* Right: inline search */}
          <div className="w-full md:w-72 shrink-0">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
              <input
                type="search"
                value={activeSearch}
                onChange={handleSearchChange}
                placeholder="Søg tilbehør..."
                className="w-full rounded-xl border border-sand bg-white/90 py-3 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal/30 shadow-sm focus:border-green-eco/50 focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TilbehoerCategoryHero(props: TilbehoerHeroProps) {
  // HeroInner uses useSearchParams — must be rendered inside Suspense by the parent.
  // Here we rely on the parent (TilbehoerLayout) already being inside a Suspense boundary.
  return <HeroInner {...props} />;
}
