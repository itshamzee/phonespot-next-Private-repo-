"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { ShopifyImage } from "@/lib/medusa/types";

type ImageGalleryProps = {
  images: ShopifyImage[];
  title: string;
};

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchImage = useCallback(
    (index: number) => {
      if (index === selectedIndex) return;
      setIsTransitioning(true);
      // Brief fade-out, then swap image and fade-in
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
    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
      {/* Thumbnails — vertical strip on desktop (left side), horizontal row on mobile (below main) */}
      {images.length > 1 && (
        <div className="order-2 md:order-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden md:max-h-[520px] py-1 md:py-0 px-0.5 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => switchImage(i)}
              className={`group relative flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden bg-cream transition-all duration-200 ${
                i === selectedIndex
                  ? "ring-2 ring-green-eco ring-offset-2 ring-offset-warm-white"
                  : "ring-1 ring-sand hover:ring-2 hover:ring-green-eco/40 hover:ring-offset-1 hover:ring-offset-warm-white"
              }`}
              aria-label={`Vis billede ${i + 1} af ${images.length}`}
              aria-current={i === selectedIndex ? "true" : undefined}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${title} - billede ${i + 1}`}
                width={80}
                height={80}
                className="h-full w-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-105"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="order-1 md:order-2 flex-1">
        <div className="group relative aspect-square rounded-3xl bg-cream overflow-hidden">
          {/* Image counter badge */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 z-10 rounded-full bg-charcoal/60 px-3 py-1 backdrop-blur-sm">
              <span className="text-xs font-medium text-white tracking-wide">
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
              className="h-full w-full object-contain p-6"
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
            />
          </div>

          {/* Zoom hint — desktop only */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 items-center justify-center pb-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <span className="flex items-center gap-1.5 rounded-full bg-charcoal/60 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
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
  );
}
