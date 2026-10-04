/**
 * Forretningsfejl fra transfer_*-funktionerne har formen
 *   transfer:<kode>[:<detalje>]   (SQLSTATE PS002)
 * og oversættes her til danske beskeder og HTTP-statusser.
 */

export class TransferError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "TransferError";
  }
}

type Entry = { status: number; message: (detail?: string) => string };

const CATALOG: Record<string, Entry> = {
  staff_not_found: { status: 403, message: () => "Medarbejderen er ikke aktiv" },
  forbidden_location: { status: 403, message: () => "Du kan kun handle for din egen butik" },
  forbidden_role: { status: 403, message: () => "Kun managere og ejere kan gøre dette" },
  same_location: { status: 400, message: () => "Vælg to forskellige butikker" },
  location_not_found: { status: 404, message: () => "Butikken findes ikke" },
  no_lines: { status: 400, message: () => "Tilføj mindst én vare" },
  too_many_lines: { status: 400, message: () => "For mange varelinjer" },
  invalid_quantity: { status: 400, message: () => "Ugyldigt antal" },
  invalid_cost: { status: 400, message: () => "Ugyldig kostpris" },
  invalid_line: { status: 400, message: () => "Ugyldig varelinje" },
  grade_required: { status: 400, message: () => "Vælg en stand" },
  sku_not_found: { status: 404, message: () => "Varen findes ikke" },
  template_not_found: { status: 404, message: () => "Produktet findes ikke" },
  device_not_found: { status: 404, message: () => "Enheden findes ikke" },
  device_unavailable: {
    status: 409,
    message: () => "Enheden er ikke ledig i afsenderens butik (solgt, reserveret eller allerede på vej)",
  },
  device_in_transfer: { status: 409, message: () => "Enheden er allerede med i en anden overførsel" },
  insufficient_stock: { status: 409, message: (d) => `Ikke nok på lager til at sende: ${d ?? "varen"}` },
  insufficient_devices: { status: 409, message: (d) => `Ikke nok ledige enheder til at sende: ${d ?? "varen"}` },
  nothing_to_send: { status: 400, message: () => "Der er ikke noget at sende" },
  nothing_to_receive: { status: 400, message: () => "Scan mindst én vare" },
  not_found: { status: 404, message: () => "Overførslen findes ikke" },
  line_not_found: { status: 404, message: () => "Varelinjen findes ikke på overførslen" },
  not_requested: { status: 409, message: () => "Overførslen er ikke længere en åben anmodning" },
  not_sent: { status: 409, message: () => "Varerne er ikke sendt endnu. Afsenderen skal først pakke og sende." },
  already_received: { status: 409, message: () => "Overførslen er allerede modtaget" },
  cancelled: { status: 409, message: () => "Overførslen er annulleret" },
  over_receive: { status: 409, message: (d) => `Der er scannet flere end der er sendt${d ? `: ${d}` : ""}` },
  partially_received: {
    status: 409,
    message: () => "En del er allerede modtaget. Luk overførslen med mangler i stedet.",
  },
};

const PATTERN = /transfer:([a-z_]+)(?::([^\n]*))?/;

/** Oversæt en Supabase/Postgres-fejl til TransferError. Ukendte fejl bliver 500 uden at lække SQL. */
export function transferError(
  fallback: string,
  error: { message?: string; code?: string } | null | undefined,
): TransferError {
  const text = error?.message ?? "";
  const m = PATTERN.exec(text);
  if (m) {
    const entry = CATALOG[m[1]];
    if (entry) return new TransferError(m[1], entry.message(m[2]?.trim() || undefined), entry.status);
  }
  console.error("[transfers]", fallback, error);
  return new TransferError("internal", fallback, 500);
}
