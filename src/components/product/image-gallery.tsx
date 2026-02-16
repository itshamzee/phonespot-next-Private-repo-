"use client";

import { useState } from "react";
import Image from "next/image";
import type { ShopifyImage } from "@/lib/shopify/types";

type ImageGalleryProps = {
  images: ShopifyImage[];
  title: string;
};

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-[16px] bg-cream flex items-center justify-center">
        <p className="text-gray">Intet billede tilg&aelig;ngeligt</p>
      </div>
    );
  }

  const mainImage = images[selectedIndex];

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse md:gap-4">
      {/* Main image */}
      <div className="flex-1">
        <div className="aspect-square rounded-[16px] bg-cream overflow-hidden">
          <Image
            src={mainImage.url}
            alt={mainImage.altText ?? title}
            width={mainImage.width}
            height={mainImage.height}
            className="h-full w-full object-contain p-8"
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
          />
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[500px]">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex-shrink-0 h-16 w-16 rounded-lg border-2 overflow-hidden bg-cream transition-colors ${
                i === selectedIndex
                  ? "border-green-eco"
                  : "border-transparent hover:border-sand"
              }`}
              aria-label={`Vis billede ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={img.altText ?? `${title} - billede ${i + 1}`}
                width={64}
                height={64}
                className="h-full w-full object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
