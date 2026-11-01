"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BLACK_NOVEMBER } from "@/lib/campaign/black-november";
import { useBlackNovember } from "@/lib/campaign/use-black-november";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

const SLIDE_MS = 6000;

// Et budskab og et foto ad gangen. Smadret-fotoet har hvid baggrund, derfor den lyse slide.
const SLIDES = [
  {
    figure: `${BLACK_NOVEMBER.repairPercent} %`,
    title: "på alle reparationer",
    href: "/reparation",
    cta: "Find din reparation",
    image: "/images/repair/telefon-med-smadret-skaerm.jpg",
    alt: "iPhone med smadret skærm",
    light: true,
    imageClass: "object-contain p-4 md:p-8",
  },
  {
    figure: `${BLACK_NOVEMBER.devicePercent} %`,
    title: "på alle brugte enheder",
    href: "/iphones",
    cta: "Se brugte iPhones",
    image:
      "https://xfcadewtpmjrvuzfwkku.supabase.co/storage/v1/object/public/product-media/iphones/cutout/apple-iphone-17-pro-soelv-1792173850693.webp",
    alt: "Brugt iPhone 17 Pro i sølv",
    light: false,
    imageClass: "object-contain p-6 md:p-8",
  },
  {
    figure: `${BLACK_NOVEMBER.accessoryPriceKr} kr.`,
    title: "for covers og beskyttelsesglas",
    href: "/tilbehoer/covers",
    cta: "Se covers",
    image: "/categories/covers.png",
    alt: "To covers til iPhone i grøn og sort",
    light: false,
    imageClass: "object-contain",
  },
] as const;

/** Forsidens kampagne: samme ramme som heroen, en slide ad gangen. */
export function BlackNovemberSlider({ serverActive }: { serverActive: boolean }) {
  const active = useBlackNovember(serverActive);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (!active || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [active, paused]);

  if (!active) return null;
  const light = SLIDES[index].light;

  return (
    <section
      aria-roledescription="karrusel"
      aria-labelledby="black-november-slider"
      className="relative my-4 h-[560px] overflow-hidden rounded-[12px] border border-[#e8ebe7] md:h-[420px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return;
        const moved = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(moved) < 40) return;
        setIndex((i) => (i + (moved < 0 ? 1 : -1) + SLIDES.length) % SLIDES.length);
      }}
    >
      <h2 id="black-november-slider" className="sr-only">
        Black November hos PhoneSpot
      </h2>
      {SLIDES.map((slide, i) => {
        const current = i === index;
        return (
          <article
            key={slide.href}
            aria-hidden={!current}
            className={`absolute inset-0 grid grid-rows-[auto_minmax(0,1fr)] transition-opacity duration-700 ease-out md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-1 ${
              slide.light ? "bg-white text-black" : "bg-black text-white"
            } ${current ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div
              className={`flex flex-col justify-center px-6 pt-8 transition-opacity md:px-10 md:pt-0 ${
                current ? "opacity-100 delay-300 duration-500" : "opacity-0 duration-150"
              }`}
            >
              <p className="text-[12px] font-[550] opacity-70">Black November</p>
              <p className="mt-3 font-display text-[64px] font-bold leading-[0.95] tracking-tight md:text-[96px]">
                {slide.figure}
              </p>
              <p className="mt-2 text-[20px] font-[550] tracking-[-0.4px] md:text-[24px]">{slide.title}</p>
              <Link
                href={slide.href}
                tabIndex={current ? 0 : -1}
                className={`mt-5 inline-flex items-center gap-2 text-[14px] font-semibold underline underline-offset-4 ${
                  slide.light ? "!text-black" : "!text-white"
                }`}
              >
                {slide.cta}
                <StorefrontIcon kind="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative min-h-0">
              {/* Fotoet kommer fra både public og produktlageret. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={current ? slide.alt : ""}
                loading={i === 0 ? "eager" : "lazy"}
                className={`absolute inset-0 h-full w-full ${slide.imageClass}`}
              />
            </div>
          </article>
        );
      })}
      <div className="absolute bottom-4 left-6 z-10 flex items-center gap-2 md:left-10">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.href}
            type="button"
            aria-label={`Vis ${slide.figure} ${slide.title}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className="flex h-6 w-8 items-center"
          >
            <span
              className={`block h-[2px] w-full transition-opacity ${light ? "bg-black" : "bg-white"} ${
                i === index ? "opacity-100" : "opacity-30"
              }`}
            />
          </button>
        ))}
      </div>
      <p className={`absolute bottom-[18px] right-6 z-10 text-[11px] opacity-60 md:right-10 ${light ? "text-black" : "text-white"}`}>
        Til og med 30. november
      </p>
    </section>
  );
}
