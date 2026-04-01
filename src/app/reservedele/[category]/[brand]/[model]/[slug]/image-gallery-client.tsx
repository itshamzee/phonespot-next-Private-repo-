"use client";

import { useState } from "react";
import Image from "next/image";

interface ImageGalleryClientProps {
  images: string[];
  title: string;
}

export function ImageGalleryClient({ images, title }: ImageGalleryClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8]">
        <Image
          src={activeImage}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-8 transition-opacity duration-200"
          priority
        />
      </div>

      {/* Thumbnails — only show when more than 1 image */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Vis billede ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === activeIndex
                  ? "border-[#1A3D2E]"
                  : "border-[#E5E5EA] hover:border-[#86868B]"
              }`}
            >
              <Image
                src={src}
                alt={`${title} — billede ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
