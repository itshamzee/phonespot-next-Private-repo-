import type { Product } from "@/lib/shopify/types";

export interface LaptopTier {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  minPrice: number;
  maxPrice: number;
  qualityPoints: string[];
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  taglineColor: string;
  countColor: string;
}

export const LAPTOP_TIERS: LaptopTier[] = [
  {
    title: "Budget",
    slug: "budget",
    tagline: "Bedste pris — perfekt til studiet",
    description:
      "Pålidelige bærbare under 2.000 kr. Ideel til studiet, browsing og daglig brug. Alle testet med 30+ kontroller og 36 måneders garanti.",
    metaTitle: "Budget Bærbare fra 1.359 kr - Refurbished | PhoneSpot",
    metaDescription:
      "Køb en kvalitetstestet bærbar under 2.000 kr med 36 måneders garanti. Perfekt til studiet og daglig brug.",
    minPrice: 0,
    maxPrice: 2000,
    qualityPoints: [
      "Fra kun 1.359 kr",
      "Perfekt til Word, browsing og Zoom",
      "Alle testet med min. 4 timers batteri",
    ],
    cardBg: "bg-green-eco/[0.03]",
    cardBorder: "border-2 border-green-eco/20",
    badgeBg: "bg-green-eco",
    badgeText: "text-white",
    taglineColor: "text-green-eco",
    countColor: "text-green-eco",
  },
  {
    title: "Mellem",
    slug: "mellem",
    tagline: "God balance mellem pris og ydelse",
    description:
      "Bærbare fra 2.000 til 4.000 kr med mere kraft og større skærme. Til dig der vil have lidt ekstra uden at sprænge budgettet.",
    metaTitle: "Mellem-klasse Bærbare 2.000-4.000 kr - Refurbished | PhoneSpot",
    metaDescription:
      "Refurbished bærbare i mellemklassen med kraftige processorer og god skærm. 36 måneders garanti.",
    minPrice: 2000,
    maxPrice: 4000,
    qualityPoints: [
      "Kraftigere processorer til multitasking",
      "14\" skærme med god opløsning",
      "Ideel til kontor og studie",
    ],
    cardBg: "bg-white",
    cardBorder: "border border-sand",
    badgeBg: "bg-sand/70",
    badgeText: "text-charcoal",
    taglineColor: "text-gray",
    countColor: "text-green-eco",
  },
  {
    title: "Premium",
    slug: "premium",
    tagline: "Topydelse til krævende brugere",
    description:
      "De nyeste og mest kraftfulde modeller over 4.000 kr. Til dig der kræver det bedste — nyere processorer, mere RAM og hurtigere SSD.",
    metaTitle: "Premium Bærbare fra 4.000 kr - Refurbished | PhoneSpot",
    metaDescription:
      "Premium refurbished bærbare med nyeste Intel i7 processorer og topspecifikationer. 36 måneders garanti.",
    minPrice: 4000,
    maxPrice: Infinity,
    qualityPoints: [
      "Nyeste Intel i7 processorer",
      "16 GB RAM og hurtig NVMe SSD",
      "Business-grade holdbarhed og kvalitet",
    ],
    cardBg: "bg-charcoal",
    cardBorder: "border-0",
    badgeBg: "bg-white/15",
    badgeText: "text-white",
    taglineColor: "text-white/60",
    countColor: "text-white/60",
  },
];

/** Get tier config by slug */
export function getLaptopTier(slug: string): LaptopTier | null {
  return LAPTOP_TIERS.find((t) => t.slug === slug) ?? null;
}

/** Get all tier slugs for static generation */
export function getAllLaptopTierSlugs(): string[] {
  return LAPTOP_TIERS.map((t) => t.slug);
}

/** Filter products into a price tier, excluding spare parts (display assemblies etc.) */
export function filterProductsByTier(
  products: Product[],
  tier: LaptopTier,
): Product[] {
  return products.filter((p) => {
    // Exclude spare parts
    const title = p.title.toLowerCase();
    if (
      title.includes("display assembly") ||
      title.includes("reservedel") ||
      title.includes("skærm") ||
      title.includes("batteri") ||
      title.includes("keyboard") ||
      title.includes("top case")
    ) {
      return false;
    }

    const price = parseFloat(p.priceRange.minVariantPrice.amount);
    return price >= tier.minPrice && price < tier.maxPrice;
  });
}

/** Filter out spare parts from laptop products */
export function filterRealLaptops(products: Product[]): Product[] {
  return products.filter((p) => {
    const title = p.title.toLowerCase();
    return !(
      title.includes("display assembly") ||
      title.includes("reservedel") ||
      title.includes("skærm") ||
      title.includes("batteri") ||
      title.includes("keyboard") ||
      title.includes("top case")
    );
  });
}
