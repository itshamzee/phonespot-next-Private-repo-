/**
 * Business errors raised by the pos_* Postgres functions look like
 *   pos:<code>[:<detail>]      (SQLSTATE PS001)
 * and are mapped here to Danish messages and HTTP statuses.
 */

export class PosError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "PosError";
  }
}

type Entry = { status: number; message: (detail?: string) => string };

const CATALOG: Record<string, Entry> = {
  register_not_found: { status: 404, message: () => "Kassen findes ikke eller er inaktiv" },
  register_location_mismatch: { status: 400, message: () => "Kassen hører ikke til den valgte lokation" },
  staff_not_found: { status: 403, message: () => "Medarbejderen er ikke aktiv" },
  no_open_session: { status: 409, message: () => "Kassen er ikke åbnet. Åbn kassen med startbeholdning først." },
  no_items: { status: 400, message: () => "Tilføj mindst ét produkt" },
  device_not_found: { status: 404, message: () => "Enheden findes ikke" },
  duplicate_device: { status: 400, message: (d) => `Enheden ${d ?? ""} er tilføjet to gange` },
  device_not_pos_sellable: { status: 409, message: (d) => `Enheden ${d ?? ""} er en leverandørvare og kan ikke sælges i kassen` },
  device_unavailable: {
    status: 409,
    message: (d) => `Enheden ${d ?? ""} er ikke længere ledig (solgt eller reserveret i webshoppen)`,
  },
  device_no_price: { status: 409, message: (d) => `Enheden ${d ?? ""} har ingen salgspris` },
  sku_not_found: { status: 404, message: () => "Varen findes ikke" },
  invalid_quantity: { status: 400, message: () => "Ugyldigt antal" },
  description_required: { status: 400, message: () => "Skriv en tekst til varelinjen" },
  invalid_price: { status: 400, message: () => "Prisen skal være større end 0" },
  invalid_item_type: { status: 400, message: () => "Ugyldig varelinje" },
  invalid_discount: { status: 400, message: () => "Ugyldig rabat" },
  discount_reason_required: { status: 400, message: () => "Vælg en årsag til rabatten" },
  discount_exceeds_total: { status: 400, message: () => "Rabatten kan ikke overstige varernes værdi" },
  invalid_payment_type: { status: 400, message: () => "Ugyldig betalingstype" },
  invalid_payment_amount: { status: 400, message: () => "Beløb skal være større end 0" },
  payment_reference_required: { status: 400, message: () => "Angiv nummer/kode på tilgodebevis eller gavekort" },
  payment_mismatch: { status: 400, message: () => "Betalingerne skal give præcis totalen" },
  customer_required_for_invoice: { status: 400, message: () => "Vælg en kunde for at betale med faktura" },
  insufficient_stock: { status: 409, message: (d) => `Ikke nok på lager: ${d ?? "varen"}` },
  order_not_found: { status: 404, message: () => "Salget findes ikke" },
  return_not_pos_order: {
    status: 400,
    message: () => "Kun kassesalg kan returneres her. Webshop-ordrer refunderes fra ordresiden.",
  },
  order_not_returnable: { status: 409, message: () => "Salget kan ikke returneres" },
  return_legacy_discount: {
    status: 409,
    message: () => "Dette salg er fra før den nye kasse og havde rabat. Lav kreditnotaen manuelt.",
  },
  return_reason_required: { status: 400, message: () => "Vælg en returårsag" },
  return_nothing: { status: 400, message: () => "Vælg mindst én vare der skal returneres" },
  return_item_not_found: { status: 404, message: () => "Varelinjen findes ikke på salget" },
  return_duplicate_line: { status: 400, message: () => "Samme varelinje er valgt to gange" },
  return_quantity_invalid: { status: 409, message: (d) => `Du kan højst returnere ${d ?? "0"} stk. af varelinjen` },
  device_not_returnable: { status: 409, message: (d) => `Enheden ${d ?? ""} står ikke som solgt og kan ikke returneres` },
  invalid_refund_type: { status: 400, message: () => "Ugyldig tilbagebetalingsmetode" },
  refund_mismatch: { status: 400, message: () => "Tilbagebetalingen skal give præcis kreditbeløbet" },
  session_already_open: { status: 409, message: () => "Kassen er allerede åbnet" },
  session_not_found: { status: 404, message: () => "Kassesessionen findes ikke" },
  session_closed: { status: 409, message: () => "Kassesessionen er allerede lukket" },
  session_not_locked: { status: 409, message: () => "Justeringer kan kun tilføjes til en lukket session" },
  invalid_opening_float: { status: 400, message: () => "Ugyldig startbeholdning" },
  invalid_counted_cash: { status: 400, message: () => "Optalt kontant skal være 0 eller mere" },
  invalid_cash_to_bank: { status: 400, message: () => "Beløb til bank kan ikke overstige optalt kontant" },
  invalid_expense: { status: 400, message: () => "Udlæg skal have tekst og et beløb over 0" },
  invalid_adjustment: { status: 400, message: () => "Justeringen skal være forskellig fra 0" },
  adjustment_reason_required: { status: 400, message: () => "Skriv en begrundelse til justeringen" },
  invalid_stock_reason: { status: 400, message: () => "Ugyldig lageråsag" },
  invalid_stock_delta: { status: 400, message: () => "Ugyldig lagerændring" },
  stock_note_required: { status: 400, message: () => "Skriv en begrundelse til lagerreguleringen" },
  stock_would_go_negative: { status: 409, message: () => "Lageret kan ikke blive negativt" },
  ticket_required: { status: 400, message: () => "Vælg den sag, depositum eller betaling hører til" },
  ticket_not_found: { status: 404, message: () => "Sagen findes ikke" },
  ticket_already_paid: { status: 409, message: (d) => `Sagen ${d ?? ""} er allerede betalt` },
  one_ticket_per_sale: { status: 400, message: () => "Et salg kan kun høre til én sag" },
  deposit_not_found: { status: 404, message: () => "Depositummet findes ikke" },
  deposit_exceeded: {
    status: 409,
    message: (d) => `Depositummet er allerede brugt eller har kun ${d ? (Number(d) / 100).toLocaleString("da-DK", { minimumFractionDigits: 2 }) : "0,00"} kr. tilbage`,
  },
  duplicate_deposit_application: { status: 400, message: () => "Samme depositum er modregnet to gange" },
  deposit_requires_repair_line: { status: 400, message: () => "Depositum kan kun modregnes i betalingen af den sag, det hører til" },
  negative_total: { status: 400, message: () => "Totalen kan ikke blive negativ. Modregn mindre depositum." },
  return_deposit_applied: {
    status: 409,
    message: () => "Depositummet er allerede brugt på en sag og kan ikke returneres. Returnér i stedet sagens betaling.",
  },
  return_deposit_pair: {
    status: 409,
    message: () => "Returnér reparationen og det modregnede depositum sammen",
  },
  location_not_found: { status: 404, message: () => "Lokationen findes ikke" },
};

const PATTERN = /pos:([a-z_]+)(?::([^\n]*))?/;

/** Turns a Supabase/Postgres error (or any error carrying a `pos:` message) into a PosError, else null. */
export function toPosError(err: unknown): PosError | null {
  if (err instanceof PosError) return err;
  const msg =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = PATTERN.exec(msg);
  if (!m) return null;
  const entry = CATALOG[m[1]];
  if (!entry) return new PosError(m[1], "Kassen kunne ikke gennemføre handlingen", 400);
  return new PosError(m[1], entry.message(m[2]), entry.status);
}

/** Wraps an rpc error: business errors become PosError, anything else a plain Error. */
export function rpcError(action: string, error: { message: string }): Error {
  return toPosError(error) ?? new Error(`${action}: ${error.message}`);
}
