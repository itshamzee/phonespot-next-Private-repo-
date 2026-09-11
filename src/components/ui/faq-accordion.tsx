"use client";

import { useId, useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const instanceId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className="divide-y divide-[#dce1db] border-y border-[#dce1db] font-body">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="bg-transparent"
          >
            <button
              type="button"
              id={`${instanceId}-question-${index}`}
              onClick={() => toggle(index)}
              className="flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-[#1a3d2e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1a3d2e]"
              aria-expanded={isOpen}
              aria-controls={`${instanceId}-answer-${index}`}
            >
              <span className="text-base font-semibold leading-relaxed text-charcoal">
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
            <div id={`${instanceId}-answer-${index}`} role="region" aria-labelledby={`${instanceId}-question-${index}`} hidden={!isOpen} className="pb-5 pr-6">
              <p className="text-sm leading-7 text-[#626a65]">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
