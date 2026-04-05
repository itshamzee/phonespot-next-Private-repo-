"use client";

import { type ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SparePartsHeroProps {
  title: string;
  subtitle: string;
  showSearch?: boolean;
  breadcrumb?: ReactNode;
}

export function SparePartsHero({ title, subtitle, showSearch, breadcrumb }: SparePartsHeroProps) {
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

  // Sync with external search param changes (e.g. from filters)
  useEffect(() => {
    setQuery(searchParams.get("search") ?? "");
  }, [searchParams]);

  return (
    <div className="border-b border-[#E5E5EA] bg-[#F7F7F8]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        {breadcrumb && <div className="mb-4">{breadcrumb}</div>}

        <h1 className="font-display text-3xl font-bold tracking-tight text-[#111111] md:text-4xl">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#86868B]">{subtitle}</p>

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
              <input
                type="search"
                name="search"
                placeholder="Søg i reservedele..."
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-xl border border-[#E5E5EA] bg-white py-3.5 pl-11 pr-4 text-base text-[#111111] placeholder:text-[#86868B] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
