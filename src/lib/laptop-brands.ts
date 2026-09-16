export const LAPTOP_BRANDS: Record<string, {
  title: string;
  shopifyTag: string;
  description: string;
  qualityPoints: string[];
}> = {
  lenovo: {
    title: "Refurbished Lenovo",
    shopifyTag: "lenovo",
    description: "ThinkPad og IdeaPad — bygget til at holde. Testet og klar til arbejde.",
    qualityPoints: ["Legendær ThinkPad-holdbarhed", "Professionelle tastaturer", "Virksomhedskvalitet til studiepris"],
  },
  apple: {
    title: "Refurbished MacBook",
    shopifyTag: "apple",
    description: "MacBook Air og Pro med Retina-skærm. Høj kvalitet, fair pris.",
    qualityPoints: ["Retina-skærm i perfekt stand", "macOS klar fra dag ét", "Unibody-kabinet i aluminium"],
  },
  hp: {
    title: "Refurbished HP",
    shopifyTag: "hp",
    description: "EliteBook og ProBook — pålidelige arbejdsheste testet til perfektion.",
    qualityPoints: ["Holdbarhed til professionelt brug", "Kraftige processorer", "Ideelle til studie og kontor"],
  },
  studiecomputer: {
    title: "Studiecomputere",
    shopifyTag: "studie",
    description: "De bedste bærbare til studerende. Kvalitet uden at sprænge SU'en.",
    qualityPoints: ["Fra under 2.000 kr", "Perfekt til Word, internet og Zoom", "Alle testet med min. 4 timers batteri"],
  },
};

export function getLaptopBrand(slug: string) {
  return LAPTOP_BRANDS[slug] ?? null;
}

export function getAllLaptopBrandSlugs() {
  return Object.keys(LAPTOP_BRANDS);
}
