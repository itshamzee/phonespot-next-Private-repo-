/**
 * API-kontrakten for "Ny sag" (docs/ny-sag-spec-2026-10.md). Rene typer og
 * konstanter, ingen imports fra server eller React, så både UI og ruter kan
 * bruge dem.
 *
 * Konventioner:
 *  - Alle felter i kontrakten er snake_case (som kataloget i spec'en).
 *  - Beløb hedder `*_oere` (heltal, inkl. moms), undtagen `price_dkk` på
 *    reparationer, som er hele kroner som i repair_services.
 *  - Priser kommer ALTID fra serveren. Klienten må sende `unit_price_oere`
 *    for at afvige, men en afvigelse kræver `price_reason`.
 *  - Fejl: { error: string, code?: string } med dansk tekst; se case-errors.ts.
 */

/* ------------------------------------------------------------------ */
/*  Grundtyper                                                          */
/* ------------------------------------------------------------------ */

/** De to fysiske butikker. */
export type CaseStore = "vejle" | "slagelse";

/** repair_services.quality_tier. standard = Budget, premium = OEM, original = Original. */
export type RepairQuality = "standard" | "premium" | "original";

export const REPAIR_QUALITY_LABELS: Record<RepairQuality, string> = {
  standard: "Budget",
  premium: "OEM",
  original: "Original",
};

export type CustomerKind = "privat" | "erhverv";

export type CaseItemKind = "repair" | "part" | "device" | "product" | "free_text";

export type ItemStockStatus =
  | "none" // intet lager involveret, eller "altid på lager"
  | "planned"
  | "reserved" // reserveret i butikken (reserved_qty / enheden)
  | "backorder" // ingen på lager, skal bestilles
  | "consumed" // brugt i reparationen (lager trukket)
  | "released" // frigivet (sagen annulleret)
  | "sold"; // solgt i kassen

/** repair_services.part_mode. none = diagnostik, software, vandskade. */
export type PartMode = "part" | "none" | "manual";

/** Maksimale længder, delt mellem UI og server. */
export const NEW_CASE_LIMITS = {
  items: 30,
  /** Enheder pr. indlevering (én sag pr. enhed). */
  devices: 10,
  description: 200,
  priceReason: 200,
  internalNotes: 2000,
  qty: 100,
} as const;

/* ------------------------------------------------------------------ */
/*  GET /api/admin/repair-catalog/tree                                  */
/* ------------------------------------------------------------------ */

export type CatalogModel = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
};

export type CatalogSeries = {
  /** "iPhone 15", "S-serien" ... Modeller uden serie samles under "Øvrige". */
  name: string;
  models: CatalogModel[];
};

export type CatalogBrand = {
  id: string;
  slug: string;
  name: string;
  device_type: string;
  logo_url: string | null;
  series: CatalogSeries[];
};

export type CatalogParentBrand = {
  /** "apple", "samsung" ... se src/lib/repairs/parent-brands.ts. */
  key: string;
  name: string;
  logo: string | null;
  brands: CatalogBrand[];
};

export type CatalogTreeResponse = { parents: CatalogParentBrand[] };

/* ------------------------------------------------------------------ */
/*  Lager pr. del / vare                                                */
/* ------------------------------------------------------------------ */

export type OtherLocationStock = { slug: CaseStore; available: number };

/** Lagerstatus for én vare i den valgte butik. */
export type StockInfo = {
  /** false = "altid på lager" (ikke optalt). Så er `available` null og intet reserveres. */
  tracked: boolean;
  /** quantity - reserved_qty i den valgte butik, aldrig under 0. null hvis ikke tracked. */
  available: number | null;
  other_locations: OtherLocationStock[];
  /** Antal på vej til butikken i en afsendt overførsel. */
  in_transit: number;
};

/* ------------------------------------------------------------------ */
/*  GET /api/admin/repair-catalog/models/:id/services?location=         */
/* ------------------------------------------------------------------ */

export type RepairPartInfo = StockInfo & {
  sku_product_id: string;
  title: string | null;
  /** Kun for manager og owner. Udeladt for andre. */
  cost_oere?: number | null;
};

export type RepairServiceOption = {
  id: string;
  slug: string;
  name: string;
  price_dkk: number;
  price_oere: number;
  quality_tier: RepairQuality | null;
  quality_label: string | null;
  estimated_minutes: number | null;
  warranty_info: string | null;
  part_mode: PartMode;
  /** Null når reparationen ikke bruger en del (none/manual) eller delen ikke er koblet endnu. */
  part: RepairPartInfo | null;
};

export type RepairServiceCategory = {
  /** Normaliseret kategorinavn: "Skærmskift", "Batteriskift" ... */
  name: string;
  services: RepairServiceOption[];
  /** Billigste kvalitet der er på lager (eller altid på lager). Forvalg i UI'et. */
  recommended_service_id: string | null;
};

export type RepairServicesResponse = {
  model: {
    id: string;
    name: string;
    brand_name: string;
    brand_slug: string;
    series: string | null;
    image_url: string | null;
    device_type: string;
  };
  /** Butikken lagertallene gælder. */
  location: CaseStore | null;
  categories: RepairServiceCategory[];
};

/* ------------------------------------------------------------------ */
/*  GET /api/admin/repair-catalog/models/:id/upsell?location=&q=        */
/* ------------------------------------------------------------------ */

export type UpsellProduct = StockInfo & {
  sku_product_id: string;
  title: string;
  brand: string | null;
  category: string | null;
  price_oere: number;
  image_url: string | null;
};

export type UpsellResponse = { location: CaseStore | null; items: UpsellProduct[] };

/** GET /api/admin/repair-catalog/devices?location=&q= : refurb-enheder der kan sælges med sagen. */
export type UpsellDevice = {
  device_id: string;
  name: string;
  storage: string | null;
  grade: string | null;
  barcode: string | null;
  price_oere: number;
  /** brugtmoms | regular. Selve momsen regnes i kassen. */
  vat_scheme: "brugtmoms" | "regular";
};

export type UpsellDevicesResponse = { location: CaseStore | null; devices: UpsellDevice[] };

/* ------------------------------------------------------------------ */
/*  Kunder                                                              */
/* ------------------------------------------------------------------ */

/** GET /api/customers/search?q=&type=privat|erhverv  ->  CustomerSearchResult[] */
export type CustomerSearchResult = {
  id: string;
  type: CustomerKind;
  name: string;
  email: string | null;
  phone: string;
  company_name: string | null;
  cvr: string | null;
  ean: string | null;
  invoice_email: string | null;
  contact_person: string | null;
  /** Antal tidligere sager. */
  ticket_count?: number;
  customer_devices?: Array<{
    id: string;
    brand: string;
    model: string;
    serial_number: string | null;
    color: string | null;
  }>;
};

/** POST /api/customers */
export type CreateCustomerRequest = {
  type: CustomerKind;
  name: string;
  phone: string;
  email?: string | null;
  company_name?: string | null;
  cvr?: string | null;
  /** 13 cifre. */
  ean?: string | null;
  invoice_email?: string | null;
  contact_person?: string | null;
};

/** GET /api/customers/cvr?cvr=12345678 (valgfrit opslag bag en knap). */
export type CvrLookupResponse = {
  cvr: string;
  company_name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  /** true hvis svaret kom fra kundens cache i stedet for cvrapi.dk. */
  cached: boolean;
};

/* ------------------------------------------------------------------ */
/*  POST /api/admin/repairs                                             */
/* ------------------------------------------------------------------ */

export type NewCaseCustomer = {
  /** Eksisterende kunde. Uden id oprettes en ny. */
  id?: string | null;
  type: CustomerKind;
  name: string;
  phone: string;
  email?: string | null;
  company_name?: string | null;
  cvr?: string | null;
  ean?: string | null;
  invoice_email?: string | null;
  contact_person?: string | null;
};

export type NewCaseDevice = {
  repair_model_id?: string | null;
  /** Vises på sagen. Hvis model-id er sat, udfyldes de fra kataloget hvis de er tomme. */
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  color?: string | null;
  /** Eksisterende customer_devices.id. */
  customer_device_id?: string | null;
  /** Enhedens adgangskode. Gemmes i repair_tickets.device_passcode, aldrig i noter. */
  passcode?: string | null;
};

export type NewCaseRepairItem = {
  kind: "repair";
  repair_service_id: string;
  /** Vælg en anden del end standarddelen (skal være koblet til reparationen). */
  part_sku_product_id?: string | null;
  unit_price_oere?: number | null;
  price_reason?: string | null;
};

export type NewCaseProductItem = {
  kind: "product";
  sku_product_id: string;
  qty: number;
  unit_price_oere?: number | null;
  price_reason?: string | null;
};

export type NewCaseDeviceItem = {
  kind: "device";
  device_id: string;
  unit_price_oere?: number | null;
  price_reason?: string | null;
};

export type NewCaseFreeTextItem = {
  kind: "free_text";
  description: string;
  unit_price_oere: number;
  qty?: number;
};

export type NewCaseItemInput =
  | NewCaseRepairItem
  | NewCaseProductItem
  | NewCaseDeviceItem
  | NewCaseFreeTextItem;

export type NewCaseDetails = {
  /** ISO-tidspunkt. */
  promised_at?: string | null;
  /** Ansvarlig medarbejder (navn, som repair_tickets.assigned_to). */
  assigned_to?: string | null;
  internal_notes?: string | null;
  /** Se ChecklistItem i supabase/types.ts. */
  checklist?: Array<{ label: string; status: string; note?: string | null }> | null;
  intake_photos?: string[] | null;
  is_urgent?: boolean;
};

export type CreateRepairCaseRequest = {
  customer: NewCaseCustomer;
  device: NewCaseDevice;
  items: NewCaseItemInput[];
  details?: NewCaseDetails;
  /** Kun ejeren kan vælge; alle andre får deres egen butik. */
  store_id?: CaseStore | null;
  /** Send SMS "modtaget" til kunden efter oprettelsen. */
  notify_sms?: boolean;
};

/** Én enhed i en indlevering med flere enheder. Hver enhed bliver til sin egen sag. */
export type NewCaseGroupDevice = {
  device: NewCaseDevice;
  items: NewCaseItemInput[];
  details?: NewCaseDetails;
};

/**
 * POST /api/admin/repairs med flere enheder: samme kunde, én sag pr. enhed, oprettet samlet
 * (alle eller ingen) og knyttet sammen med et fælles gruppe-id (repair_tickets.intake_group_id).
 * Maks. NEW_CASE_LIMITS.devices enheder. Én Idempotency-Key gælder hele gruppen.
 */
export type CreateRepairCaseGroupRequest = {
  customer: NewCaseCustomer;
  devices: NewCaseGroupDevice[];
  store_id?: CaseStore | null;
  /** Én SMS med alle sagsnumre. */
  notify_sms?: boolean;
};

/** Header: `Idempotency-Key: <uuid>`. Samme nøgle + samme body gentager svaret (replayed: true). */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** En linje på sagen, som UI og kasse ser den. */
export type CaseItemView = {
  id: string;
  parent_item_id: string | null;
  kind: CaseItemKind;
  description: string;
  quality_label: string | null;
  qty: number;
  list_price_oere: number;
  unit_price_oere: number;
  total_oere: number;
  price_reason: string | null;
  stock_status: ItemStockStatus;
  location_slug: CaseStore | null;
  repair_service_id: string | null;
  sku_product_id: string | null;
  device_id: string | null;
  order_item_id: string | null;
  /** Kun manager og owner. */
  cost_oere?: number | null;
};

/** En del der skal bestilles (ingen på lager i sagens butik). */
export type CaseBackorder = {
  item_id: string;
  sku_product_id: string;
  description: string;
  qty: number;
  other_locations: OtherLocationStock[];
};

export type CreateRepairCaseResponse = {
  ticket_id: string;
  ticket_number: string | null;
  customer_id: string;
  lines: CaseItemView[];
  backorders: CaseBackorder[];
  total_oere: number;
  /** true når mindst én del skal bestilles: UI'et foreslår depositum. */
  needs_deposit: boolean;
  /** /admin/kasse?sag=<id> */
  kasse_url: string;
  /** /admin/kasse?sag=<id>&depositum=1 */
  deposit_url: string;
  replayed: boolean;
  warnings: string[];
};

export type CreateRepairCaseGroupResponse = {
  /** Null når gruppen kun har én enhed (så er der ingen gruppe). */
  group_id: string | null;
  customer_id: string;
  /** Én pr. enhed, i samme rækkefølge som `devices` i requesten. */
  tickets: CreateRepairCaseResponse[];
  ticket_ids: string[];
  total_oere: number;
  needs_deposit: boolean;
  replayed: boolean;
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/*  Linjer på en eksisterende sag                                       */
/* ------------------------------------------------------------------ */

/** POST /api/admin/repairs/:id/items */
export type AddCaseItemRequest = { item: NewCaseItemInput };
export type AddCaseItemResponse = { lines: CaseItemView[]; backorders: CaseBackorder[]; total_oere: number };

/** DELETE /api/admin/repairs/:id/items/:itemId */
export type RemoveCaseItemResponse = { lines: CaseItemView[]; backorders: CaseBackorder[]; total_oere: number };

/** POST /api/admin/repairs/:id/items/:itemId/swap-part (itemId = reparationslinjen eller dellinjen) */
export type SwapPartRequest = { sku_product_id: string };
export type SwapPartResponse = { lines: CaseItemView[]; backorders: CaseBackorder[]; total_oere: number };

/** POST /api/admin/repairs/:id/cancel */
export type CancelCaseRequest = { reason: string };
export type CancelCaseResponse = { ticket_id: string; status: "annulleret"; released_items: number };

/* ------------------------------------------------------------------ */
/*  Statusruten                                                         */
/* ------------------------------------------------------------------ */

/**
 * PATCH /api/repairs/:id/status med status "faerdig" kalder repair_consume_parts.
 * Svaret får `parts_consumed` (antal dele trukket fra lager) når der var nogen;
 * en fejl dér giver `warning`, ikke 500.
 */
export type StatusResponseExtras = { parts_consumed?: number };
