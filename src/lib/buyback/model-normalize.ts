// Maps the buyback wizard's model string to the product_templates.model string.
// Most Apple iPhones match 1:1; this table only lists the known divergences.
// Extend as mismatches surface (iPad/MacBook labels with quotes/parens, etc.).
const MODEL_REMAP: Record<string, string> = {
  "iPhone SE (3. gen)": "iPhone SE (2022)",
  "iPhone SE (2. gen)": "iPhone SE (2020)",
};

export interface NormalizedModel {
  templateModel: string;
  isApple: boolean;
  knownModel: boolean;
}

export function normalizeModel(brand: string, model: string): NormalizedModel {
  const trimmedModel = (model ?? "").trim();
  const isApple = (brand ?? "").trim().toLowerCase() === "apple";
  if (!trimmedModel) {
    return { templateModel: "", isApple, knownModel: false };
  }
  const templateModel = MODEL_REMAP[trimmedModel] ?? trimmedModel;
  return { templateModel, isApple, knownModel: true };
}
