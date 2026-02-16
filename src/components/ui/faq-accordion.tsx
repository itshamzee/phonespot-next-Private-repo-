"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="overflow-hidden rounded-[16px] border border-sand bg-white"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-warm-white/50"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
            >
              <span className="pr-4 font-display text-lg font-bold italic text-charcoal">
                {item.question}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-5 w-5 shrink-0 text-gray transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isOpen && (
              <div id={`faq-answer-${index}`} className="border-t border-sand px-6 pb-5 pt-4">
                <p className="leading-relaxed text-gray">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
