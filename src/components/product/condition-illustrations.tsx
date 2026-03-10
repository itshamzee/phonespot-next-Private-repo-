"use client";

import { useState } from "react";
import Image from "next/image";

type Grade = "A" | "B" | "C";
type DeviceType = "watch" | "phone" | "ipad" | "laptop";

const GRADE_META: Record<Grade, { label: string; description: string; badgeBg: string; badgeColor: string; ringColor: string }> = {
  A: {
    label: "Som ny",
    description: "Enheden fremstår næsten som ny. Ingen synlige ridser eller brugstegn. Skærmen er perfekt og batteriet er i top tilstand.",
    badgeBg: "bg-green-eco/10",
    badgeColor: "text-green-eco",
    ringColor: "ring-green-eco",
  },
  B: {
    label: "God stand",
    description: "Enheden kan have lette brugsspor som små ridser på bagsiden eller rammen. Skærmen er fri for ridser. Fuldt funktionel.",
    badgeBg: "bg-amber-50",
    badgeColor: "text-amber-600",
    ringColor: "ring-amber-500",
  },
  C: {
    label: "Okay stand",
    description: "Enheden har tydelige brugsspor såsom ridser eller små mærker. Alle funktioner virker perfekt. Bedste pris.",
    badgeBg: "bg-gray/10",
    badgeColor: "text-gray",
    ringColor: "ring-gray",
  },
};

const CONDITION_IMAGES: Record<DeviceType, Record<Grade, { display: string; frame: string }>> = {
  watch: {
    A: { display: "/quality/watch-grade-a-display.png", frame: "/quality/watch-grade-a-frame.png" },
    B: { display: "/quality/watch-grade-b-display.png", frame: "/quality/watch-grade-b-frame.png" },
    C: { display: "/quality/watch-grade-c-display.png", frame: "/quality/watch-grade-c-frame.png" },
  },
  phone: {
    A: { display: "/quality/grade-a-display.png", frame: "/quality/grade-a-frame.png" },
    B: { display: "/quality/grade-b-display.png", frame: "/quality/grade-b-frame.png" },
    C: { display: "/quality/grade-c-display.png", frame: "/quality/grade-c-frame.png" },
  },
  ipad: {
    A: { display: "/quality/ipad-grade-a-display.png", frame: "/quality/ipad-grade-a-frame.png" },
    B: { display: "/quality/ipad-grade-b-display.png", frame: "/quality/ipad-grade-b-frame.png" },
    C: { display: "/quality/ipad-grade-c-display.png", frame: "/quality/ipad-grade-c-frame.png" },
  },
  laptop: {
    A: { display: "/quality/grade-a-display.png", frame: "/quality/grade-a-frame.png" },
    B: { display: "/quality/grade-b-display.png", frame: "/quality/grade-b-frame.png" },
    C: { display: "/quality/grade-c-display.png", frame: "/quality/grade-c-frame.png" },
  },
};

export function ConditionIllustrations({ deviceType = "phone" }: { deviceType?: DeviceType }) {
  const [view, setView] = useState<"frame" | "display">("frame");

  const frameLabel = deviceType === "laptop" ? "Låg & bagside" : "Bagside";
  const displayLabel = deviceType === "laptop" ? "Tastatur & skærm" : "Forside";

  return (
    <div>
      {/* Front/back toggle */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex gap-1 rounded-full bg-charcoal/5 p-1">
          <button
            type="button"
            onClick={() => setView("frame")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              view === "frame"
                ? "bg-white text-charcoal shadow-sm"
                : "text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {frameLabel}
          </button>
          <button
            type="button"
            onClick={() => setView("display")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              view === "display"
                ? "bg-white text-charcoal shadow-sm"
                : "text-charcoal/50 hover:text-charcoal"
            }`}
          >
            {displayLabel}
          </button>
        </div>
      </div>

      {/* Grade cards with images */}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {(["A", "B", "C"] as Grade[]).map((grade) => {
          const meta = GRADE_META[grade];
          const imgs = CONDITION_IMAGES[deviceType][grade];

          return (
            <div
              key={grade}
              className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm"
            >
              {/* Condition image */}
              <div className="relative aspect-[4/3] bg-sand/30">
                <Image
                  src={view === "frame" ? imgs.frame : imgs.display}
                  alt={`${meta.label} — ${view === "frame" ? "bagside" : "forside"}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Grade badge overlay */}
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm ${meta.badgeBg} ${meta.badgeColor}`}>
                    Grade {grade}
                  </span>
                </div>
              </div>

              {/* Text content */}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.badgeBg} text-base font-bold ${meta.badgeColor}`}>
                    {grade}
                  </span>
                  <span className="font-display text-lg font-bold text-charcoal">
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-charcoal/70">
                  {meta.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
