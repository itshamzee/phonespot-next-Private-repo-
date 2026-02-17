"use client";

import { useState } from "react";
import Image from "next/image";

const grades = [
  {
    grade: "A" as const,
    title: "Som ny",
    subtitle: "Grade A",
    color: "border-green-eco",
    bullets: [
      "Skærmen er fejlfri",
      "Kabinettet har ingen synlige ridser",
      "Batteriet er testet til min. 85% kapacitet",
    ],
    displayImage: "/quality/grade-a-display.png",
    frameImage: "/quality/grade-a-frame.png",
  },
  {
    grade: "B" as const,
    title: "Meget god",
    subtitle: "Grade B",
    color: "border-green-light",
    bullets: [
      "Skærmen er i perfekt stand",
      "Kabinettet kan have lette brugsridser",
      "Batteriet er testet til min. 80% kapacitet",
    ],
    displayImage: "/quality/grade-b-display.png",
    frameImage: "/quality/grade-b-frame.png",
  },
  {
    grade: "C" as const,
    title: "OK stand",
    subtitle: "Grade C",
    color: "border-gray",
    bullets: [
      "Skærmen kan have lette ridser",
      "Kabinettet har synlige brugsspor",
      "Batteriet er testet til min. 75% kapacitet",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/grade-c-display.png",
    frameImage: "/quality/grade-c-frame.png",
  },
];

type ConditionExplainerProps = {
  variant?: "full" | "compact";
};

function FullVariant() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {grades.map((g) => (
        <div
          key={g.grade}
          className={`overflow-hidden rounded-radius-lg border-2 ${g.color} bg-white`}
        >
          <div className="flex aspect-[4/3] items-center justify-center gap-2 bg-sand/30 p-4">
            <div className="relative h-full w-1/2">
              <Image
                src={g.displayImage}
                alt={`${g.title} display`}
                fill
                className="object-contain"
              />
            </div>
            <div className="relative h-full w-1/2">
              <Image
                src={g.frameImage}
                alt={`${g.title} ramme`}
                fill
                className="object-contain"
              />
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-display text-2xl font-bold text-charcoal">
              {g.title}
            </h3>
            <p className="mb-4 text-sm text-gray">{g.subtitle}</p>
            <ul className="space-y-2">
              {g.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-charcoal">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-eco"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactVariant() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-variant="compact">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-green-eco underline underline-offset-2 transition-colors hover:text-green-eco/80"
      >
        Hvad betyder standen?
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {grades.map((g) => (
            <div
              key={g.grade}
              className={`flex gap-3 rounded-radius-lg border ${g.color} bg-white p-3`}
            >
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src={g.displayImage}
                  alt={`${g.title} display`}
                  fill
                  className="rounded object-contain"
                />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-charcoal">
                  {g.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {g.bullets.slice(0, 2).map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1 text-xs text-gray">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mt-0.5 h-3 w-3 shrink-0 text-green-eco"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConditionExplainer({ variant = "full" }: ConditionExplainerProps) {
  if (variant === "compact") {
    return <CompactVariant />;
  }
  return <FullVariant />;
}
