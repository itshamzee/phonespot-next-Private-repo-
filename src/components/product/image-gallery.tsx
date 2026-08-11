"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import type { ShopifyImage } from "@/lib/shopify/types";

type ImageGalleryProps = {
  images: ShopifyImage[];
  title: string;
  activeIndex?: number;
  /**
   * "accessory" swaps the "Refurbished & testet / 36 mdr. garanti /
   * 30-punkt kvalitetstest" strip below the gallery for claims that are
   * actually true of a sku_product (new goods, not a graded refurbished
   * device, not covered by the 36-month device warranty). Without this,
   * every accessory PDP using this gallery — e.g. a leather iPad case —
   * inherited the device warranty/grade-test claims verbatim.
   */
  variant?: "device" | "accessory";
};

export function ImageGallery({ images, title, activeIndex, variant = "device" }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(activeIndex ?? 0);

  // Sync with external activeIndex (e.g. from grade picker)
  const prevActiveIndex = useRef(activeIndex);
  if (activeIndex !== undefined && activeIndex !== prevActiveIndex.current) {
    prevActiveIndex.current = activeIndex;
    if (activeIndex !== selectedIndex && activeIndex < images.length) {
      setSelectedIndex(activeIndex);
    }
  }
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchImage = useCallback(
    (index: number) => {
      if (index === selectedIndex) return;
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setSelectedIndex(index);
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    },
    [selectedIndex],
  );

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-3xl bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sand/40">
            <svg
              className="h-8 w-8 text-gray"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray">Intet billede tilgængeligt</p>
        </div>
      </div>
    );
  }

  const mainImage = images[selectedIndex];

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      {/* Gallery area */}
      <div className="flex flex-col gap-2 md:flex-row md:gap-4">
        {/* Thumbnails — vertical strip on desktop, horizontal on mobile */}
        {images.length > 1 && (
          <div className="order-2 md:order-1 flex md:flex-col gap-2 sm:gap-3 overflow-x-auto overscroll-x-contain md:overflow-y-auto md:overflow-x-hidden md:max-h-[520px] p-1 scrollbar-none">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => switchImage(i)}
                className={`group relative flex-shrink-0 h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] rounded-xl overflow-hidden bg-cream transition-all duration-200 ${
                  i === selectedIndex
                    ? "ring-[2.5px] ring-green-eco shadow-md"
                    : "ring-1 ring-charcoal/10 hover:ring-2 hover:ring-green-eco/50"
                }`}
                aria-label={`Vis billede ${i + 1} af ${images.length}`}
                aria-current={i === selectedIndex ? "true" : undefined}
              >
                <Image
                  src={img.url}
                  alt={img.altText ?? `${title} - billede ${i + 1}`}
                  width={72}
                  height={72}
                  className="h-full w-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-105"
                  sizes="72px"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="order-1 md:order-2 flex-1">
          <div className="group relative aspect-[4/3] sm:aspect-square rounded-2xl bg-cream overflow-hidden border border-sand/60">
            {/* Image counter badge */}
            {images.length > 1 && (
              <div className="absolute top-3 right-3 z-10 rounded-full bg-charcoal/60 px-2.5 py-0.5 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-white tracking-wide">
                  {selectedIndex + 1} / {images.length}
                </span>
              </div>
            )}

            {/* Product image with fade transition */}
            <div
              className={`h-full w-full transition-opacity duration-150 ease-in-out ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
            >
              <Image
                src={mainImage.url}
                alt={mainImage.altText ?? title}
                width={mainImage.width}
                height={mainImage.height}
                className="h-full w-full object-contain p-4 sm:p-8"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>

            {/* Zoom hint — desktop only */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 items-center justify-center pb-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
              <span className="flex items-center gap-1.5 rounded-full bg-charcoal/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"
                  />
                </svg>
                Klik for at forstørre
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip below gallery — hidden on mobile (shown in product-info compact strip) */}
      <div className="hidden sm:flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl bg-sand/40 px-4 py-3">
        {variant === "accessory" ? (
          <>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">Hurtig levering</span>
            </div>
            <span className="hidden text-charcoal/20 sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">2 års reklamationsret</span>
            </div>
            <span className="hidden text-charcoal/20 sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">14 dages retur</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">Refurbished & testet</span>
            </div>
            <span className="hidden text-charcoal/20 sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">36 mdr. garanti</span>
            </div>
            <span className="hidden text-charcoal/20 sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.723-9.285v0" />
              </svg>
              <span className="text-xs font-medium text-charcoal/70">30-punkt kvalitetstest</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
