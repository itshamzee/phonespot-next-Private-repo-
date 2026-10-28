import type { Identified } from "./types";

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

function cleanText(text: string): string {
  let out = text.replace(EMOJI, "");
  // "Panserglas" er et beskyttet varemærke (AGENTS.md).
  out = out.replace(/panserglas/gi, (m) => (m[0] === m[0].toUpperCase() ? "Beskyttelsesglas" : "beskyttelsesglas"));
  // Tilbehør har 2 års reklamationsret, aldrig 36 måneders garanti.
  out = out
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !(/36\s*m/i.test(sentence) && /garanti/i.test(sentence)))
    .join(" ");
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Renser AI-svaret: kun kendte model-slugs, ingen emojis eller forbudte påstande. */
export function sanitizeIdentified(raw: Identified, validSlugs: Set<string>): Identified {
  const models = [...new Set(raw.models)].filter((m) => validSlugs.has(m));
  return {
    ...raw,
    models,
    modelConfidence: models.length === 0 ? "low" : raw.modelConfidence,
    titleDa: cleanText(raw.titleDa),
    descriptionDa: cleanText(raw.descriptionDa),
    features: raw.features.map(cleanText).filter(Boolean),
    color: raw.color ? cleanText(raw.color) || null : null,
    supplierCodes: raw.supplierCodes.filter((c) => /^[A-Za-z0-9-]{4,32}$/.test(c)),
    readText: cleanText(raw.readText).slice(0, 500),
  };
}
