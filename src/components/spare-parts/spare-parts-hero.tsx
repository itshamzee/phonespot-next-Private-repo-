"use client";

import { type ReactNode, Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

interface SparePartsHeroProps {
  title: string;
  subtitle: string;
  showSearch?: boolean;
  breadcrumb?: ReactNode;
  backgroundImage?: string;
}

/* ------------------------------------------------------------------ */
/*  Shared shell — title/subtitle/breadcrumb/image are all known       */
/*  synchronously (plain props, not gated on useSearchParams), so the  */
/*  same markup renders in both the real component and the Suspense   */
/*  fallback below. Only the search box differs (interactive vs a      */
/*  static, identically-sized look-alike), which keeps the fallback's  */
/*  height pixel-equal to the hydrated result and avoids the layout    */
/*  shift a `fallback={null}` used to cause.                           */
/* ------------------------------------------------------------------ */

function HeroShell({
  title,
  subtitle,
  showSearch,
  breadcrumb,
  backgroundImage,
  searchBox,
}: SparePartsHeroProps & { searchBox: ReactNode }) {
  const hasImage = !!backgroundImage;

  return (
    <div className={`relative overflow-hidden ${hasImage ? "bg-[#1A3D2E]" : "border-b border-[#E5E5EA] bg-[#F7F7F8]"}`}>
      {/* Background image with overlay */}
      {hasImage && (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A3D2E]/90 via-[#1A3D2E]/80 to-[#1A3D2E]/50" />
        </>
      )}

      <div className={`relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${hasImage ? "py-14 md:py-20" : "py-10 md:py-14"}`}>
        {breadcrumb && (
          <div className={`mb-4 ${hasImage ? "[&_a]:text-white/70 [&_a:hover]:text-white [&_li]:text-white/50 [&_.font-medium]:text-white" : ""}`}>
            {breadcrumb}
          </div>
        )}

        {hasImage && (
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            B2B RESERVEDELE
          </span>
        )}

        <h1 className={`font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${hasImage ? "text-white" : "text-[#111111]"}`}>
          {title}
        </h1>

        <p className={`mt-3 max-w-2xl text-base leading-relaxed md:text-lg ${hasImage ? "text-white/75" : "text-[#86868B]"}`}>
          {subtitle}
        </p>

        {showSearch && (
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              {searchBox}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SEARCH_INPUT_CLASS =
  "w-full rounded-xl border border-[#E5E5EA] bg-white py-3.5 pl-11 pr-4 text-base text-[#111111] shadow-sm placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10";

/* ------------------------------------------------------------------ */
/*  Interactive version — needs useSearchParams, so it must live       */
/*  behind a Suspense boundary.                                        */
/* ------------------------------------------------------------------ */

function SparePartsHeroInner(props: SparePartsHeroProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`/reservedele?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch(value), 400);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pushSearch(query);
    }
  }

  useEffect(() => {
    setQuery(searchParams.get("search") ?? "");
  }, [searchParams]);

  return (
    <HeroShell
      {...props}
      searchBox={
        <input
          type="search"
          name="search"
          placeholder="Søg reservedele — skærm, batteri, model..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={SEARCH_INPUT_CLASS}
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Suspense fallback — same shell, a static (disabled) twin of the    */
/*  search input so the SSR/pre-hydration paint is the same height as  */
/*  the real thing. Eliminates the CLS that `fallback={null}` caused.  */
/* ------------------------------------------------------------------ */

function SparePartsHeroFallback(props: SparePartsHeroProps) {
  return (
    <HeroShell
      {...props}
      searchBox={
        <input
          type="search"
          disabled
          readOnly
          placeholder="Søg reservedele — skærm, batteri, model..."
          value=""
          aria-hidden="true"
          tabIndex={-1}
          className={SEARCH_INPUT_CLASS}
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Exported wrapper with Suspense (useSearchParams requires one)     */
/* ------------------------------------------------------------------ */

export function SparePartsHero(props: SparePartsHeroProps) {
  return (
    <Suspense fallback={<SparePartsHeroFallback {...props} />}>
      <SparePartsHeroInner {...props} />
    </Suspense>
  );
}
