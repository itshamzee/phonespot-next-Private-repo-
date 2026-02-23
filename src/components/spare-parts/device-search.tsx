"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAllModels } from "@/lib/spare-parts";

export function DeviceSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allModels = useMemo(() => getAllModels(), []);

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return allModels
      .filter((m) => m.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allModels]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(categorySlug: string, modelSlug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/reservedele/${categorySlug}/${modelSlug}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Søg efter din enhed..."
          className="w-full rounded-full border border-sand bg-white py-3.5 pl-12 pr-4 text-sm text-charcoal placeholder:text-gray/60 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-sand/50 bg-white p-2 shadow-lg">
          {filtered.map((model) => (
            <button
              key={`${model.categorySlug}-${model.slug}`}
              type="button"
              onClick={() => handleSelect(model.categorySlug, model.slug)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cream"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-eco/10 text-green-eco">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal">{model.label}</p>
                <p className="text-xs text-gray">{model.categoryLabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
