/**
 * Finder den sælg-side, der passer til en reparationsmodel eller en
 * produktkategori, så reparations- og produktsider kan linke direkte til den
 * rigtige side under /saelg-din-enhed i stedet for kun til forsiden af flowet.
 *
 * Returnerer null, når vi ikke har en side, der passer. Det gælder blandt
 * andet iPhones ældre end iPhone 11, som vi ikke køber.
 */
import { getIphoneSellPage } from "@/app/saelg-din-enhed/iphone/[model]/models";
import { getModelPage, getModelPages } from "@/app/saelg-din-enhed/[device]/[model]/models";

export type SellLink = { href: string; label: string };

const SELL_ROOT = "/saelg-din-enhed";

function modelLink(device: string, slug: string, name: string): SellLink | null {
  return getModelPage(device, slug) ? { href: `${SELL_ROOT}/${device}/${slug}`, label: `Sælg ${name}` } : null;
}

/** Længste sælg-slug, som reparations-sluggen begynder med ("xbox-one-x" → "xbox-one"). */
function prefixLink(device: string, repairSlug: string, name: string): SellLink | null {
  const match = getModelPages(device)
    .filter((page) => !page.slug.startsWith("defekt"))
    .filter((page) => repairSlug === page.slug || repairSlug.startsWith(page.slug))
    .sort((a, b) => b.slug.length - a.slug.length)[0];
  return match ? { href: `${SELL_ROOT}/${device}/${match.slug}`, label: `Sælg ${name}` } : null;
}

export function sellLinkForRepairModel(brandSlug: string, modelSlug: string, modelName: string): SellLink | null {
  switch (brandSlug) {
    case "iphone": {
      // iPhone 8, X, XR og XS deler to samlesider; iPhone 7 og ældre køber vi ikke.
      const slug = /^iphone-8(-plus)?$/.test(modelSlug) ? "iphone-8" : /^iphone-x(r|s|s-max)?$/.test(modelSlug) ? "iphone-x" : modelSlug;
      return getIphoneSellPage(slug) && slug !== "defekt"
        ? { href: `${SELL_ROOT}/iphone/${slug}`, label: `Sælg ${modelName}` }
        : null;
    }
    case "samsung":
      return prefixLink("samsung", modelSlug, modelName);
    case "ipad": {
      const kind = /pro/.test(modelSlug) ? "ipad-pro" : /air/.test(modelSlug) ? "ipad-air" : /mini/.test(modelSlug) ? "ipad-mini" : "ipad-almindelig";
      return modelLink("ipad", kind, modelName);
    }
    case "macbook": {
      const line = /air/.test(modelSlug) ? "air" : /pro/.test(modelSlug) ? "pro" : null;
      const chip = modelSlug.match(/-m(\d)(?:-|$)/)?.[1];
      const exact = line && chip ? modelLink("macbook", `macbook-${line}-m${chip}`, modelName) : null;
      return exact ?? { href: `${SELL_ROOT}/macbook`, label: `Sælg ${modelName}` };
    }
    case "apple-watch":
      return { href: `${SELL_ROOT}/apple-watch`, label: `Sælg ${modelName}` };
    case "playstation":
    case "xbox":
    case "nintendo": {
      if (/dualsense-edge/.test(modelSlug)) return modelLink("controller", "dualsense-edge", modelName);
      if (/dualsense/.test(modelSlug)) return modelLink("controller", "dualsense", modelName);
      if (/controller/.test(modelSlug)) return brandSlug === "xbox" ? modelLink("controller", "xbox-controller", modelName) : null;
      return prefixLink("spillekonsol", modelSlug, modelName);
    }
    default:
      return null;
  }
}

const CATEGORY_HUB: Record<string, string> = {
  iphone: `${SELL_ROOT}/iphone`,
  ipad: `${SELL_ROOT}/ipad`,
};

/** Sælg-hub for en produktkategori; falder tilbage til forsiden af sælg-flowet. */
export function sellHubForCategory(category?: string): string {
  return (category && CATEGORY_HUB[category]) || SELL_ROOT;
}
