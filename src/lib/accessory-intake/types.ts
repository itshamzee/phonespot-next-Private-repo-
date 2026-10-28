/** Fælles typer for AI-tilbehørsoptagelsen (/admin/produkter/hurtig-cover). */

export type IntakeProductType = "cover" | "flip_cover" | "screen_protector" | "other";
export type IntakeCaseType = "Clear" | "Slim" | "Rugged" | "Wallet" | "Flip" | "Bumper";

/** Det AI'en læste af et foto af pakken eller varen. */
export interface Identified {
  productType: IntakeProductType;
  brand: string | null;
  isGenuineBrandProduct: boolean;
  models: string[];
  unknownModelText: string | null;
  modelConfidence: "high" | "medium" | "low";
  caseType: IntakeCaseType | null;
  color: string | null;
  features: string[];
  titleDa: string;
  descriptionDa: string;
  supplierCodes: string[];
  readText: string;
}

export interface MatchCandidate {
  id: string;
  title: string;
  images: string[] | null;
  selling_price: number;
  status: string;
  subcategory: string;
  brand: string | null;
  compatible_models: string[] | null;
  attributes: Record<string, string> | null;
  stock: Record<string, number>;
  score: number;
}
