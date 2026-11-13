"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomImage } from "./zoom-image";

type DeviceType = "phone" | "watch" | "ipad" | "laptop";

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
    subtitle: "Stand A",
    color: "border-green-eco",
    bullets: [
      "Skærmen er fejlfri",
      "Kabinettet har ingen synlige ridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/grade-a-display.webp",
    frameImage: "/quality/grade-a-frame.webp",
  },
  {
    grade: "B",
    title: "God stand",
    subtitle: "Stand B",
    color: "border-green-light",
    bullets: [
      "Skærmen er i perfekt stand",
      "Kabinettet kan have lette brugsridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/grade-b-display.webp",
    frameImage: "/quality/grade-b-frame.webp",
  },
  {
    grade: "C",
    title: "Brugt stand",
    subtitle: "Stand C",
    color: "border-gray",
    bullets: [
      "Skærmen kan have lette ridser",
      "Kabinettet har synlige brugsspor",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/grade-c-display.webp",
    frameImage: "/quality/grade-c-frame.webp",
  },
];

const WATCH_GRADES: GradeData[] = [
  {
    grade: "A",
    title: "Som ny",
    subtitle: "Stand A",
    color: "border-green-eco",
    bullets: [
      "Glasset er fejlfrit",
      "Kassen har ingen synlige ridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/watch-grade-a-display.webp",
    frameImage: "/quality/watch-grade-a-frame.webp",
  },
  {
    grade: "B",
    title: "God stand",
    subtitle: "Stand B",
    color: "border-green-light",
    bullets: [
      "Glasset er i perfekt stand",
      "Kassen kan have lette brugsridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/watch-grade-b-display.webp",
    frameImage: "/quality/watch-grade-b-frame.webp",
  },
  {
    grade: "C",
    title: "Brugt stand",
    subtitle: "Stand C",
    color: "border-gray",
    bullets: [
      "Glasset kan have lette ridser",
      "Kassen har synlige brugsspor",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/watch-grade-c-display.webp",
    frameImage: "/quality/watch-grade-c-frame.webp",
  },
];

const IPAD_GRADES: GradeData[] = [
  {
    grade: "A",
    title: "Som ny",
    subtitle: "Stand A",
    color: "border-green-eco",
    bullets: [
      "Skærmen er fejlfri",
      "Kabinettet har ingen synlige ridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/ipad-grade-a-display.webp",
    frameImage: "/quality/ipad-grade-a-frame.webp",
  },
  {
    grade: "B",
    title: "God stand",
    subtitle: "Stand B",
    color: "border-green-light",
    bullets: [
      "Skærmen er i perfekt stand",
      "Kabinettet kan have lette brugsridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/ipad-grade-b-display.webp",
    frameImage: "/quality/ipad-grade-b-frame.webp",
  },
  {
    grade: "C",
    title: "Brugt stand",
    subtitle: "Stand C",
    color: "border-gray",
    bullets: [
      "Skærmen kan have lette ridser",
      "Kabinettet har synlige brugsspor",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/ipad-grade-c-display.webp",
    frameImage: "/quality/ipad-grade-c-frame.webp",
  },
];

const LAPTOP_GRADES: GradeData[] = [
  {
    grade: "A",
    title: "Som ny",
    subtitle: "Stand A",
    color: "border-green-eco",
    bullets: [
      "Skærmen og tastaturet er fejlfri",
      "Kabinettet har ingen synlige ridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/laptop-grade-a-display.webp",
    frameImage: "/quality/laptop-grade-a-frame.webp",
  },
  {
    grade: "B",
    title: "God stand",
    subtitle: "Stand B",
    color: "border-green-light",
    bullets: [
      "Skærmen og tastaturet er i perfekt stand",
      "Kabinettet kan have lette brugsridser",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
    ],
    displayImage: "/quality/laptop-grade-b-display.webp",
    frameImage: "/quality/laptop-grade-b-frame.webp",
  },
  {
    grade: "C",
    title: "Brugt stand",
    subtitle: "Stand C",
    color: "border-gray",
    bullets: [
      "Skærmen kan have lette ridser",
      "Kabinettet har synlige brugsspor",
      "Batterikapaciteten er målt for den enkelte enhed og fremgår på produktsiden",
      "Mest budgetvenlige valg",
    ],
    displayImage: "/quality/laptop-grade-c-display.webp",
    frameImage: "/quality/laptop-grade-c-frame.webp",
  },
];

const GRADES_MAP: Record<DeviceType, GradeData[]> = {
  phone: PHONE_GRADES,
  watch: WATCH_GRADES,
  ipad: IPAD_GRADES,
  laptop: LAPTOP_GRADES,
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
    <div className="relative aspect-[4/3] overflow-hidden bg-white">
      {/* Image */}
      <Image
        src={view === "display" ? displayImage : frameImage}
        alt={`${title} — ${view === "display" ? "forside" : "bagside"}`}
        fill
        className="object-contain p-2"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <ZoomImage
        src={view === "display" ? displayImage : frameImage}
        alt={`${title}, ${view === "display" ? "forside" : "bagside"}`}
      />

      {/* Toggle pills */}
      <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1 rounded-full bg-charcoal/70 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setView("frame")}
          className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
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
          className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
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
  // Ét stort billede af den valgte stand frem for tre små kort, så forskellen
  // mellem standene kan ses (og zoomes) på samme billede.
  const [active, setActive] = useState(grades[1]?.grade ?? grades[0].grade);
  const g = grades.find((x) => x.grade === active) ?? grades[0];
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#dde2dd] bg-white">
      <div role="tablist" aria-label="Vælg stand" className="grid grid-cols-3 border-b border-[#dde2dd]">
        {grades.map((x) => (
          <button
            key={x.grade}
            type="button"
            role="tab"
            aria-selected={x.grade === active}
            onClick={() => setActive(x.grade)}
            className={`min-h-14 border-b-2 px-2 py-3 text-left transition-colors sm:px-5 ${
              x.grade === active
                ? "border-[#1a3d2e] bg-[#f4f5f2] text-charcoal"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <span className="block text-[11px] font-semibold text-[#5a8c6f]">{x.subtitle}</span>
            <span className="block text-sm font-semibold sm:text-base">{x.title}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ImageSlider displayImage={g.displayImage} frameImage={g.frameImage} title={g.title} />
        <div className="px-5 pb-6 pt-5 sm:px-6">
          <p className="text-xs font-semibold text-[#5a8c6f]">{g.subtitle}</p>
          <h3 className="mt-1 font-body text-2xl font-semibold tracking-[-0.03em] text-charcoal">{g.title}</h3>
          <ul className="mt-4 space-y-2.5">
            {g.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm leading-6 text-charcoal/80">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-green-eco" />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-5 text-[#626862]">
            Billedet viser et eksempel på standen. Tryk på billedet for at zoome ind.
          </p>
        </div>
      </div>
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
                <p className="font-body text-sm font-bold text-charcoal">
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
