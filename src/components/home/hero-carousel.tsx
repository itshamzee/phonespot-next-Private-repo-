"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSlide {
  image: string;
  label: string;
  category: string;
  href: string;
}

const SLIDES: HeroSlide[] = [
  {
    image: "/images/products/iphone-14-pro-max.png",
    label: "iPhone 14 Pro Max",
    category: "iPhones",
    href: "/iphones",
  },
  {
    image: "/images/products/thinkpad-x1-carbon.png",
    label: "ThinkPad X1 Carbon",
    category: "B\u00e6rbare",
    href: "/baerbare",
  },
  {
    image: "/images/products/iphone-13-pro.png",
    label: "iPhone 13 Pro",
    category: "iPhones",
    href: "/iphones",
  },
  {
    image: "/images/products/ipad-air-new.png",
    label: "iPad Air",
    category: "iPads",
    href: "/ipads",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % SLIDES.length);
  }, []);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const slide = SLIDES[active];

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background glow */}
      <div className="absolute inset-0 rounded-3xl bg-[#1A3D2E]/[0.05]" />

      {/* Image area */}
      <div className="relative z-10 flex h-[480px] w-full items-center justify-center md:h-[540px]">
        {SLIDES.map((s, i) => (
          <div
            key={s.image}
            className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out"
            style={{
              opacity: i === active ? 1 : 0,
              transform: i === active ? "scale(1) translateY(0)" : "scale(0.95) translateY(8px)",
              pointerEvents: i === active ? "auto" : "none",
            }}
          >
            <Image
              src={s.image}
              alt={s.label}
              width={500}
              height={500}
              className="max-h-[460px] w-auto object-contain drop-shadow-xl md:max-h-[500px]"
              sizes="50vw"
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* Category label */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        <span className="rounded-full bg-[#1A3D2E]/10 px-3 py-1 text-xs font-bold text-[#1A3D2E]">
          {slide.category}
        </span>
        <span className="text-sm font-semibold text-[#111111]">{slide.label}</span>
      </div>

      {/* Dots */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 bg-[#1A3D2E]"
                : "w-2 bg-[#E5E5EA] hover:bg-[#1A3D2E]/30"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
