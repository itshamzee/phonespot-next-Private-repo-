"use client";

import { useB2B } from "@/components/b2b/b2b-context";
import { QualityAlternatives } from "@/components/spare-parts/quality-alternatives";

interface QualityAlternative {
  id: string;
  title: string;
  slug: string | null;
  selling_price: number;
  sale_price: number | null;
  images: string[];
  is_inquiry_only: boolean;
  quality_tier?: {
    name: string;
    slug: string;
    badge_color: string;
    badge_text_color: string;
    short_description: string | null;
    default_warranty_months: number;
  };
}

interface Props {
  alternatives: QualityAlternative[];
  currentProductId: string;
  categorySlug: string;
  brandSlug: string;
  modelSlug: string;
}

export function QualityAlternativesWrapper({
  alternatives,
  currentProductId,
  categorySlug,
  brandSlug,
  modelSlug,
}: Props) {
  const { isLoggedIn, isApproved } = useB2B();
  const showPrices = isLoggedIn && isApproved;

  return (
    <QualityAlternatives
      alternatives={alternatives}
      currentProductId={currentProductId}
      categorySlug={categorySlug}
      brandSlug={brandSlug}
      modelSlug={modelSlug}
      showPrices={showPrices}
    />
  );
}
