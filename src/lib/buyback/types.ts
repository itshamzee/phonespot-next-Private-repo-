// Device + condition as stored in contact_inquiries.metadata.devices[]
export interface BuybackDevice {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  useCustom: boolean;
  brandCustom: string;
  modelCustom: string;
}

export interface BuybackCondition {
  screen: string;
  back: string;
  battery: string;
  allWorking: string;
  brokenParts: string[];
  cloudLocked: string;
}

export type FaultType = "screen" | "back_glass" | "battery" | "charging";

export interface ResolvedFault {
  type: FaultType;
  partPriceOre: number; // resolved faults always have a concrete part price (øre)
  cleaningProbability: number; // 0..1, internal upside only
}

export interface BuybackSettings {
  targetMarginPct: number; // e.g. 0.40 — the margin we AIM for (least generous offer)
  floorMarginPct: number; // e.g. 0.30 — minimum margin during negotiation
  floorMarginMinOre: number; // e.g. 40000 (400 kr) — absolute floor on cheap models
  cleaningProbability: Record<FaultType, number>;
}

export interface PricingInputs {
  saleValueOre: number | null; // PhoneSpot's own refurbished sale price (base); null → manual
  faults: { type: FaultType; partPriceOre: number | null }[];
  isApple: boolean;
  knownModel: boolean;
  cloudLocked: boolean;
  competitorCeilingOre?: number | null; // Plan 3 supplies this; unused here
}

export type PricingStatus = "ok" | "manual";

export interface PricingResult {
  status: PricingStatus;
  manualReason?: string;
  saleValueOre: number | null;
  faults: ResolvedFault[];
  totalDeductionOre: number;
  targetMarginPct: number;
  floorMarginOre: number;
  aimOfferOre: number; // initial offer (40% margin)
  floorOfferOre: number; // most generous offer during negotiation
  ceilingOfferOre: number | null; // competitor cap (Plan 3); null here
  expectedMarginUpsideOre: number; // Σ cleaningProbability × partPrice (internal)
}
