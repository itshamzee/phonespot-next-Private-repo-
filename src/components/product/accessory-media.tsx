"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Product photos for accessories. Desktop: every photo large in a two-column
 * grid (first one full width) next to a sticky buy column, so the photos the
 * shop already has do the selling. Mobile: a swipeable strip with a counter.
 * Clicking a photo opens it full screen.
 */
export function AccessoryMedia({
  images,
  title,
  overrideImage,
}: {
  images: string[];
  title: string;
  /** Variant photo chosen in the buy column; shown first while selected. */
  overrideImage?: string | null;
}) {
  const photos = overrideImage ? [overrideImage, ...images.filter((i) => i !== overrideImage)] : images;
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(() => {
    const el = stripRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  if (photos.length === 0) {
    return <div className="aspect-square w-full rounded-2xl bg-[#f4f5f2]" aria-hidden />;
  }

  return (
    <>
      {/* Mobile: swipe */}
      <div className="relative -mx-5 sm:-mx-9 lg:hidden">
        <div
          ref={stripRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Vis billede ${i + 1} af ${photos.length} i fuld størrelse`}
              className="relative aspect-square w-full shrink-0 snap-center bg-[#f4f5f2]"
            >
              <Image src={src} alt={i === 0 ? title : `${title}, billede ${i + 1}`} fill className="object-contain p-8 mix-blend-multiply" sizes="100vw" priority={i === 0} />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <p className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-charcoal/80 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
            {slide + 1} / {photos.length}
          </p>
        )}
      </div>

      {/* Desktop: grid */}
      <div className="hidden grid-cols-2 gap-3 lg:grid">
        {photos.map((src, i) => {
          const wide = i === 0 || (i === photos.length - 1 && photos.length % 2 === 0);
          return (
            <button
              key={src}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Vis billede ${i + 1} af ${photos.length} i fuld størrelse`}
              className={`group relative cursor-zoom-in overflow-hidden rounded-2xl bg-[#f4f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-eco ${
                wide ? "col-span-2 aspect-[4/3]" : "aspect-square"
              }`}
            >
              <Image
                src={src}
                alt={i === 0 ? title : `${title}, billede ${i + 1}`}
                fill
                className={`object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-[1.03] ${wide ? "p-10" : "p-7"}`}
                sizes={wide ? "(min-width: 1280px) 760px, 60vw" : "(min-width: 1280px) 380px, 30vw"}
                priority={i === 0}
              />
            </button>
          );
        })}
      </div>

      {lightbox !== null && <Lightbox photos={photos} title={title} index={lightbox} onIndex={setLightbox} />}
    </>
  );
}

function Lightbox({
  photos,
  title,
  index,
  onIndex,
}: {
  photos: string[];
  title: string;
  index: number;
  onIndex: (i: number | null) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const step = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onIndex, step]);

  const arrow = "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-charcoal shadow-md hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-eco";

  return (
    <div role="dialog" aria-modal="true" aria-label={`${title}, billede ${index + 1} af ${photos.length}`} className="fixed inset-0 z-[80] bg-white">
      <button type="button" aria-label="Luk" className="absolute inset-0 cursor-zoom-out" onClick={() => onIndex(null)} tabIndex={-1} />
      <div className="pointer-events-none absolute inset-0 p-6 sm:p-14">
        <div className="relative h-full w-full">
          <Image src={photos[index]} alt={title} fill className="object-contain" sizes="100vw" />
        </div>
      </div>
      <button ref={closeRef} type="button" onClick={() => onIndex(null)} className="absolute right-4 top-4 rounded-full bg-cream px-4 py-2 text-sm font-medium text-charcoal hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-eco">
        Luk
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Forrige billede" onClick={() => step(-1)} className={`${arrow} left-4`}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" aria-label="Næste billede" onClick={() => step(1)} className={`${arrow} right-4`}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm tabular-nums text-gray">{index + 1} / {photos.length}</p>
        </>
      )}
    </div>
  );
}
