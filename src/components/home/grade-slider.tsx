"use client";

import { useState } from "react";
import Image from "next/image";

const GRADES = [
  {
    grade: "A",
    title: "Som ny",
    desc: "Ingen synlige brugstegn. Skærm og kabinet er fejlfrie.",
    image: "/quality/grade-a.png",
    color: "bg-green-eco",
  },
  {
    grade: "B",
    title: "Meget god",
    desc: "Skærmen er perfekt. Kabinettet kan have lette brugsridser.",
    image: "/quality/grade-b.png",
    color: "bg-green-light",
  },
  {
    grade: "C",
    title: "OK stand",
    desc: "Lette skærmridser og synlige brugsspor. Mest budgetvenlige valg.",
    image: "/quality/grade-c.png",
    color: "bg-gray",
  },
];

export function GradeSlider() {
  const [active, setActive] = useState(0);
  const current = GRADES[active];

  return (
    <div>
      {/* Large image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-cream">
        {GRADES.map((g, i) => (
          <Image
            key={g.grade}
            src={g.image}
            alt={`Grade ${g.grade} — ${g.title}`}
            fill
            className={`object-cover transition-opacity duration-500 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Grade badge overlay */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${current.color} font-display text-sm font-bold text-white`}>
            {current.grade}
          </span>
          <span className="font-display text-sm font-bold text-charcoal">
            {current.title}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-center text-sm text-gray">
        {current.desc}
      </p>

      {/* Tab buttons */}
      <div className="mt-4 flex justify-center gap-2">
        {GRADES.map((g, i) => (
          <button
            key={g.grade}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              i === active
                ? "bg-charcoal text-white shadow-md"
                : "bg-sand/60 text-charcoal hover:bg-sand"
            }`}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              i === active ? "bg-white text-charcoal" : `${g.color} text-white`
            }`}>
              {g.grade}
            </span>
            {g.title}
          </button>
        ))}
      </div>
    </div>
  );
}
