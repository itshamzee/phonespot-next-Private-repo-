/**
 * X- og Z-rapport fra butikkens kortterminal. SERVER ONLY.
 *
 * X-rapporten aflæser terminalens tællere siden sidste Z-rapport og bruges til
 * at udfylde "terminalens total" ved kasselukning. Z-rapporten afslutter dagen
 * på terminalen (tællerne nulstilles) og gemmes i pos_terminal_reports, fordi
 * den ikke kan hentes igen.
 */
import { createServerClient } from "@/lib/supabase/client";
import { PosError } from "./errors";
import {
  FlatpayClient,
  FlatpayError,
  flatpayConfig,
  flatpayStoreConfig,
  flatpayTerminalId,
  type FlatpayDeps,
  type FlatpayReport,
} from "./flatpay";
import { paymentTerminalKindFor } from "./payment-terminal";

type Env = Record<string, string | undefined>;

export type TerminalReportKind = "x" | "z";

export type TerminalReport = {
  kind: TerminalReportKind;
  terminalId: string;
  saleCount: number;
  saleAmount: number;
  refundCount: number;
  refundAmount: number;
  /** Kortsalg minus refunderinger, i øre: tallet der afstemmes mod kassens kortsalg. */
  netAmount: number;
  sequentialId: number | null;
  raw: FlatpayReport;
};

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0);

/** Flatpays svar omsat til vores tal. */
export function toTerminalReport(kind: TerminalReportKind, terminalId: string, raw: FlatpayReport): TerminalReport {
  const saleAmount = int(raw.saleAmount);
  const refundAmount = int(raw.refundAmount);
  return {
    kind,
    terminalId,
    saleCount: int(raw.saleCount),
    saleAmount,
    refundCount: int(raw.refundCount),
    refundAmount,
    netAmount: saleAmount - refundAmount,
    sequentialId: typeof raw.sequentialId === "number" ? raw.sequentialId : null,
    raw,
  };
}

/** Om butikken har en terminal, vi kan hente rapporter fra. */
export function terminalReportsAvailable(locationSlug: string, env: Env = process.env): boolean {
  return paymentTerminalKindFor(locationSlug, env) === "flatpay";
}

export async function fetchTerminalReport(
  locationSlug: string,
  kind: TerminalReportKind,
  env: Env = process.env,
  deps: FlatpayDeps = {},
): Promise<TerminalReport> {
  if (!terminalReportsAvailable(locationSlug, env)) {
    throw new PosError("terminal_report_unavailable", "Butikkens terminal er ikke koblet til kassen", 409);
  }
  const config = flatpayStoreConfig(flatpayConfig(env), locationSlug);
  const terminalId = flatpayTerminalId(config, locationSlug)!;
  try {
    const raw = await new FlatpayClient(config, deps).report(kind, terminalId);
    if (raw.reportResponse === false) {
      throw new PosError("terminal_report_failed", "Terminalen kunne ikke lave rapporten. Prøv igen", 502);
    }
    return toTerminalReport(kind, terminalId, raw);
  } catch (err) {
    if (err instanceof PosError) throw err;
    const offline = err instanceof FlatpayError && (err.status === 0 || err.status === 404 || err.status === 408);
    throw new PosError(
      "terminal_report_failed",
      offline
        ? "Terminalen svarer ikke. Tjek, at den er tændt og på nettet"
        : "Terminalen kunne ikke lave rapporten. Tast totalen i hånden",
      502,
    );
  }
}

export async function locationSlugFor(locationId: string): Promise<string> {
  const { data } = await createServerClient().from("locations").select("slug").eq("id", locationId).maybeSingle();
  return (data as { slug?: string | null } | null)?.slug ?? "";
}

/** Gemmer en rapport som dokumentation. Kaster ved databasefejl. */
export async function saveTerminalReport(input: {
  report: TerminalReport;
  locationId: string;
  cashSessionId?: string | null;
  staffId?: string | null;
}): Promise<void> {
  const r = input.report;
  const { error } = await createServerClient().from("pos_terminal_reports").insert({
    location_id: input.locationId,
    cash_session_id: input.cashSessionId ?? null,
    kind: r.kind,
    terminal_id: r.terminalId,
    sale_count: r.saleCount,
    sale_amount: r.saleAmount,
    refund_count: r.refundCount,
    refund_amount: r.refundAmount,
    net_amount: r.netAmount,
    sequential_id: r.sequentialId,
    raw: r.raw,
    created_by: input.staffId ?? null,
  });
  if (error) throw new Error(`Failed to save terminal report: ${error.message}`);
}
