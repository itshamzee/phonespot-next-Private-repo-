"use client";

import { Suspense } from "react";
import { ImageGallery } from "@/components/product/image-gallery";
import type { ShopifyImage } from "@/lib/shopify/types";

export function ImageGalleryWithGrade({
  images,
  title,
  variant = "device",
}: {
  images: ShopifyImage[];
  title: string;
  deviceType?: string;
  /** Forwarded to ImageGallery — see its doc comment. */
  variant?: "device" | "accessory";
}) {
  return (
    <Suspense fallback={<ImageGallery images={images} title={title} variant={variant} />}>
      <ImageGallery images={images} title={title} variant={variant} />
    </Suspense>
  );
}
