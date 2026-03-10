"use client";

import { Suspense } from "react";
import { ImageGallery } from "@/components/product/image-gallery";
import type { ShopifyImage } from "@/lib/shopify/types";

export function ImageGalleryWithGrade({
  images,
  title,
}: {
  images: ShopifyImage[];
  title: string;
  deviceType?: string;
}) {
  return (
    <Suspense fallback={<ImageGallery images={images} title={title} />}>
      <ImageGallery images={images} title={title} />
    </Suspense>
  );
}
