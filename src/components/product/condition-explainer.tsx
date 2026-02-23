"use client";

import { useState } from "react";
import Image from "next/image";

type DeviceType = "phone" | "watch" | "ipad";

type GradeData = {
  grade: "A" | "B" | "C";
  title: string;
  subtitle: string;
  color: string;
  bullets: string[];
  displayImage: string;
  frameImage: string;
};

const PHONE_GRADES: GradeData[] = [
  {
    grade: "A",
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
    grade: "B",
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
    grade: "C",
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

const WATCH_GRADES: GradeData[] = [
  {
    grade: "A",
    title: "Som ny",
    subtitle: "Grade A",
    color: "border-green-eco",
    bullets: [
      "Glasset er fejlfrit",
      "Kassen har ingen synlige ridser",
      "Batteriet er testet til min. 85% kapacitet",
    ],
    displayImage: "/quality/watch-grade-a-display.png",
    frameImage: "/quality/watch-grade-a-frame.png",
  },
  {
    grade: "B",
    title: "Meget god",
    subtitle: "Grade B",
    color: "border-green-light",
    bullets: [
      "Glasset er i perfekt stand",
      "Kassen kan have lette brugsridser",
      "Batteriet er testet til min. 80% kapacitet",
    ],
    displayImage: "/quality/watch-grade-b-display.png",
    frameImage: "/quality/watch-grade-b-frame.png",
  },
  {
    grade: "C",
    title: "OK stand",
    subtitle: "Grade C",
    color: "border-gray",
    bullets: [
      "Glasset kan have lette ridser",
      "Kassen har synlige brugsspor",
      "Batteriet er testet til min. 75% kapacitet",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/watch-grade-c-display.png",
    frameImage: "/quality/watch-grade-c-frame.png",
  },
];

const IPAD_GRADES: GradeData[] = [
  {
    grade: "A",
    title: "Som ny",
    subtitle: "Grade A",
    color: "border-green-eco",
    bullets: [
      "Skærmen er fejlfri",
      "Kabinettet har ingen synlige ridser",
      "Batteriet er testet til min. 85% kapacitet",
    ],
    displayImage: "/quality/ipad-grade-a-display.png",
    frameImage: "/quality/ipad-grade-a-frame.png",
  },
  {
    grade: "B",
    title: "Meget god",
    subtitle: "Grade B",
    color: "border-green-light",
    bullets: [
      "Skærmen er i perfekt stand",
      "Kabinettet kan have lette brugsridser",
      "Batteriet er testet til min. 80% kapacitet",
    ],
    displayImage: "/quality/ipad-grade-b-display.png",
    frameImage: "/quality/ipad-grade-b-frame.png",
  },
  {
    grade: "C",
    title: "OK stand",
    subtitle: "Grade C",
    color: "border-gray",
    bullets: [
      "Skærmen kan have lette ridser",
      "Kabinettet har synlige brugsspor",
      "Batteriet er testet til min. 75% kapacitet",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/ipad-grade-c-display.png",
    frameImage: "/quality/ipad-grade-c-frame.png",
  },
];

const GRADES_MAP: Record<DeviceType, GradeData[]> = {
  phone: PHONE_GRADES,
  watch: WATCH_GRADES,
  ipad: IPAD_GRADES,
};

type ImageView = "display" | "frame";

function ImageSlider({
  displayImage,
  frameImage,
  title,
}: {
  displayImage: string;
  frameImage: string;
  title: string;
}) {
  const [view, setView] = useState<ImageView>("frame");

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-sand/30">
      {/* Image */}
      <Image
        src={view === "display" ? displayImage : frameImage}
        alt={`${title} — ${view === "display" ? "forside" : "bagside"}`}
        fill
        className="object-cover"
      />

      {/* Toggle pills */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-charcoal/70 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setView("frame")}
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] transition-colors ${
            view === "frame"
              ? "bg-white text-charcoal"
              : "text-white/70 hover:text-white"
          }`}
        >
          Bagside
        </button>
        <button
          type="button"
          onClick={() => setView("display")}
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] transition-colors ${
            view === "display"
              ? "bg-white text-charcoal"
              : "text-white/70 hover:text-white"
          }`}
        >
          Forside
        </button>
      </div>
    </div>
  );
}

type ConditionExplainerProps = {
  variant?: "full" | "compact";
  deviceType?: DeviceType;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FullVariant({ grades }: { grades: GradeData[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {grades.map((g) => (
        <div
          key={g.grade}
          className={`group overflow-hidden rounded-3xl border ${g.color} bg-white shadow-sm transition-shadow hover:shadow-md`}
        >
          <ImageSlider
            displayImage={g.displayImage}
            frameImage={g.frameImage}
            title={g.title}
          />
          <div className="px-6 pb-6 pt-5">
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="font-display text-xl font-bold text-charcoal">
                {g.title}
              </h3>
              <span className="text-xs font-medium text-gray">{g.subtitle}</span>
            </div>
            <ul className="space-y-2">
              {g.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm text-charcoal/80">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-eco" />
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

function CompactVariant({ grades }: { grades: GradeData[] }) {
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
              className={`overflow-hidden rounded-2xl border ${g.color} bg-white shadow-sm`}
            >
              <ImageSlider
                displayImage={g.displayImage}
                frameImage={g.frameImage}
                title={g.title}
              />
              <div className="p-3">
                <p className="font-display text-sm font-bold text-charcoal">
                  {g.title}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {g.bullets.slice(0, 2).map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1 text-xs text-gray">
                      <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-green-eco" />
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

export function ConditionExplainer({ variant = "full", deviceType = "phone" }: ConditionExplainerProps) {
  const grades = GRADES_MAP[deviceType];

  if (variant === "compact") {
    return <CompactVariant grades={grades} />;
  }
  return <FullVariant grades={grades} />;
}
