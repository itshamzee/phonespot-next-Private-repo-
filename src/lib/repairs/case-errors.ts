/**
 * Forretningsfejl fra repair_case_* / repair_consume_parts i Postgres:
 *   case:<kode>[:<detalje>]      (SQLSTATE PS003, se 20261005130000_repair_case_functions.sql)
 * oversættes her til danske beskeder og HTTP-status. Samme mønster som pos/errors.ts.
 */
import { NextResponse } from "next/server";

export class CaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "CaseError";
  }
}

type Entry = { status: number; message: (detail?: string) => string };

const d = (detail: string | undefined, fallback = "varen") => detail?.trim() || fallback;

export const CASE_ERROR_CATALOG: Record<string, Entry> = {
  staff_not_found: { status: 403, message: () => "Medarbejderen er ikke aktiv" },
  forbidden_store: { status: 403, message: () => "Du har ikke adgang til denne butik" },
  store_required: { status: 400, message: () => "Vælg hvilken butik sagen oprettes i" },
  no_items: { status: 400, message: () => "Tilføj mindst én reparation" },
  too_many_items: { status: 400, message: () => "For mange linjer på sagen" },
  repair_required: { status: 400, message: () => "Tilføj mindst én reparation eller en fritekstlinje" },
  idempotency_conflict: {
    status: 409,
    message: () => "Samme forsøg er sendt med andre oplysninger. Opdater siden og prøv igen.",
  },
  request_in_progress: { status: 409, message: () => "Sagen oprettes allerede. Vent et øjeblik og tjek sagslisten." },
  invalid_customer_type: { status: 400, message: () => "Vælg Privat eller Erhverv" },
  customer_name_required: { status: 400, message: () => "Skriv kundens navn" },
  customer_phone_required: { status: 400, message: () => "Skriv kundens telefonnummer" },
  invalid_cvr: { status: 400, message: () => "CVR-nummer skal være 8 cifre" },
  invalid_ean: { status: 400, message: () => "EAN-nummer skal være 13 cifre" },
  invalid_invoice_email: { status: 400, message: () => "Fakturamailen er ikke en gyldig mailadresse" },
  company_required: { status: 400, message: () => "Skriv firmanavn for en erhvervskunde" },
  customer_not_found: { status: 404, message: () => "Kunden findes ikke" },
  model_not_found: { status: 404, message: () => "Modellen findes ikke i kataloget" },
  device_model_required: { status: 400, message: () => "Vælg eller skriv hvilken enhed der indleveres" },
  customer_device_not_found: { status: 404, message: () => "Kundens enhed findes ikke" },
  duplicate_service: { status: 400, message: (x) => `${d(x, "Reparationen")} er tilføjet to gange` },
  service_not_found: { status: 404, message: () => "Reparationen findes ikke eller er ikke aktiv" },
  service_model_mismatch: { status: 400, message: () => "Reparationen hører til en anden model end sagens enhed" },
  part_not_allowed: { status: 400, message: () => "Delen passer ikke til reparationen" },
  sku_not_found: { status: 404, message: () => "Varen findes ikke" },
  sku_repair_only: { status: 400, message: () => "Varen er en reservedel og kan ikke sælges som tilkøb" },
  sku_inactive: { status: 409, message: () => "Varen er ikke længere til salg" },
  invalid_quantity: { status: 400, message: () => "Ugyldigt antal" },
  invalid_price: { status: 400, message: () => "Ugyldig pris" },
  price_reason_too_long: { status: 400, message: () => "Begrundelsen for prisen er for lang" },
  price_reason_required: { status: 400, message: (x) => `Skriv en begrundelse, når prisen på ${d(x)} afviger fra listeprisen` },
  product_no_price: { status: 409, message: (x) => `${d(x)} har ingen salgspris` },
  device_not_found: { status: 404, message: () => "Enheden findes ikke" },
  device_not_sellable: { status: 409, message: () => "Enheden er en leverandørvare og kan ikke sælges i butikken" },
  device_unavailable: { status: 409, message: (x) => `Enheden ${d(x, "")} er ikke længere ledig` },
  device_other_location: { status: 409, message: (x) => `Enheden ${d(x, "")} står i den anden butik. Flyt den først.` },
  device_no_price: { status: 409, message: (x) => `Enheden ${d(x, "")} har ingen salgspris` },
  description_required: { status: 400, message: () => "Skriv en tekst til linjen" },
  invalid_item_kind: { status: 400, message: () => "Ugyldig linje" },
  ticket_not_found: { status: 404, message: () => "Sagen findes ikke" },
  ticket_paid: { status: 409, message: () => "Sagen er betalt og kan ikke ændres" },
  ticket_closed: { status: 409, message: (x) => `Sagen er ${x === "annulleret" ? "annulleret" : "afsluttet"} og kan ikke ændres` },
  legacy_ticket: {
    status: 409,
    message: () => "Sagen er oprettet før de nye sagslinjer og kan ikke redigeres her. Opret en ny sag eller brug kassen.",
  },
  item_not_found: { status: 404, message: () => "Linjen findes ikke på sagen" },
  item_sold: { status: 409, message: () => "Linjen er allerede solgt i kassen" },
  item_consumed: { status: 409, message: () => "Delen er allerede brugt i reparationen" },
  not_a_repair_item: { status: 400, message: () => "Vælg reparationen eller delen, der skal skiftes" },
  cancel_reason_required: { status: 400, message: () => "Skriv hvorfor sagen annulleres" },
  already_cancelled: { status: 409, message: () => "Sagen er allerede annulleret" },
  cancel_not_allowed: { status: 409, message: () => "En afhentet eller betalt sag kan ikke annulleres" },
  cancel_has_sold_items: { status: 409, message: () => "Noget på sagen er allerede solgt i kassen. Returnér det først." },
  cancel_has_deposit: {
    status: 409,
    message: () => "Der ligger et depositum på sagen. Refunder det i kassen, før sagen annulleres.",
  },
};

const PATTERN = /case:([a-z_]+)(?::([^\n]*))?/;

/** Fanger case:<kode> i en Supabase/Postgres-fejl (eller en CaseError), ellers null. */
export function toCaseError(err: unknown): CaseError | null {
  if (err instanceof CaseError) return err;
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = PATTERN.exec(msg);
  if (!m) return null;
  const entry = CASE_ERROR_CATALOG[m[1]];
  if (!entry) return new CaseError(m[1], "Sagen kunne ikke gennemføre handlingen", 400);
  return new CaseError(m[1], entry.message(m[2]?.trim() || undefined), entry.status);
}

/** Pakker en rpc-fejl: forretningsfejl bliver CaseError, alt andet en almindelig Error. */
export function caseRpcError(action: string, error: { message: string }): Error {
  return toCaseError(error) ?? new Error(`${action}: ${error.message}`);
}

/** JSON-svar for en fanget fejl. Ukendte fejl logges og giver en neutral 500. */
export function caseErrorResponse(err: unknown, fallback: string): NextResponse {
  const ce = toCaseError(err);
  if (ce) return NextResponse.json({ error: ce.message, code: ce.code }, { status: ce.status });
  console.error("[repairs]", fallback, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
