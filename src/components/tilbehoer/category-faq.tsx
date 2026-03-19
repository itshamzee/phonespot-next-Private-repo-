"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface CategoryFaqProps {
  items: FaqItem[];
}

export function CategoryFaq({ items }: CategoryFaqProps) {
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 font-display text-2xl font-bold tracking-tight text-charcoal">
        Ofte stillede spørgsmål
      </h2>
      <div className="divide-y divide-sand">
        {items.map((item, i) => (
          <div key={i} className="py-4">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <span className="font-semibold text-charcoal">{item.q}</span>
              <span className="shrink-0 text-charcoal/40">
                {open === i ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </span>
            </button>
            {open === i && (
              <p className="mt-3 text-sm leading-relaxed text-charcoal/70">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
