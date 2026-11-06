import type { createServerClient } from "@/lib/supabase/client";
import { verifyPin } from "@/lib/auth/pin";

/**
 * Pinkode-forsøg med trinvis låsning mod public.staff_pins (kun service role).
 *
 * failed_attempts nulstilles KUN af en rigtig pinkode eller en ny pinkode,
 * aldrig af at en lås udløber:
 *   5 forkerte  -> låst 15 minutter
 *   10 forkerte -> låst 30 minutter
 *   15 eller flere -> låst, indtil der sættes en ny pinkode
 *
 * Tælleren opdateres med compare-and-set på failed_attempts (opdateringen
 * gælder kun, hvis tælleren stadig har den værdi, vi læste; ellers læses
 * rækken igen), så samtidige forkerte forsøg ikke kan tælle som ét.
 */

type Supabase = ReturnType<typeof createServerClient>;

export const PIN_LOCK_15_MESSAGE = "Pinkoden er låst i 15 minutter";
export const PIN_LOCK_30_MESSAGE = "Pinkoden er låst i 30 minutter";
export const PIN_LOCK_PERMANENT_MESSAGE = "Pinkoden er låst. Bed ejeren om at sætte en ny pinkode";

const FIRST_LOCK_AT = 5;
const SECOND_LOCK_AT = 10;
const PERMANENT_LOCK_AT = 15;
const MINUTE = 60_000;
/** Postgres timestamptz 'infinity': låst, indtil en ny pinkode sættes. */
const PERMANENT_LOCK = "infinity";
const CAS_RETRIES = 5;

export type PinRow = { pin_hash: string; failed_attempts: number; locked_until: string | null };

export type PinAttemptResult =
  | { kind: "ok" }
  | { kind: "wrong" }
  | { kind: "locked"; message: string }
  /** Ingen staff_pins-række: medarbejderen har ingen pinkode. */
  | { kind: "no_pin" };

/** Ny locked_until efter et forkert forsøg, der bringer tælleren op på `attempts`, eller null (ingen lås). */
export function lockUntilFor(attempts: number, nowMs: number): string | null {
  if (attempts >= PERMANENT_LOCK_AT) return PERMANENT_LOCK;
  if (attempts === SECOND_LOCK_AT) return new Date(nowMs + 30 * MINUTE).toISOString();
  if (attempts === FIRST_LOCK_AT) return new Date(nowMs + 15 * MINUTE).toISOString();
  return null;
}

export function lockMessageFor(attempts: number): string {
  if (attempts >= PERMANENT_LOCK_AT) return PIN_LOCK_PERMANENT_MESSAGE;
  if (attempts >= SECOND_LOCK_AT) return PIN_LOCK_30_MESSAGE;
  return PIN_LOCK_15_MESSAGE;
}

/** Låst nu? En locked_until, der ikke kan læses som et endeligt tidspunkt ('infinity', fejl), tæller som låst. */
export function isPinLocked(row: Pick<PinRow, "failed_attempts" | "locked_until">, nowMs: number): boolean {
  if (row.failed_attempts >= PERMANENT_LOCK_AT) return true;
  if (row.locked_until === null || row.locked_until === undefined) return false;
  const until = Date.parse(row.locked_until);
  if (!Number.isFinite(until)) return true;
  return until > nowMs;
}

/**
 * Prøver `pin` for medarbejderen. `pin = null` registrerer et forkert forsøg
 * uden at prøve koden (bruges når forespørgslen alligevel skal afvises).
 * `context` kommer med i loggen, når en lås sættes.
 */
export async function attemptPin(
  supabase: Supabase,
  staffId: string,
  pin: string | null,
  context: { location: string | null },
): Promise<PinAttemptResult> {
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from("staff_pins")
      .select("pin_hash, failed_attempts, locked_until")
      .eq("staff_id", staffId)
      .maybeSingle();
    if (error) throw new Error(`staff_pins lookup failed: ${error.message}`);
    if (!data) return { kind: "no_pin" };
    const row = data as PinRow;

    const now = Date.now();
    if (isPinLocked(row, now)) return { kind: "locked", message: lockMessageFor(row.failed_attempts) };

    const ok = pin !== null && verifyPin(pin, row.pin_hash);
    const next = ok ? 0 : row.failed_attempts + 1;
    const lockedUntil = ok ? null : lockUntilFor(next, now);
    const { data: updated, error: updateError } = await supabase
      .from("staff_pins")
      .update({ failed_attempts: next, locked_until: lockedUntil, updated_at: new Date(now).toISOString() })
      .eq("staff_id", staffId)
      .eq("failed_attempts", row.failed_attempts)
      .select("staff_id");
    if (updateError) throw new Error(`staff_pins update failed: ${updateError.message}`);
    if (!updated || updated.length === 0) continue; // en anden forespørgsel nåede først

    if (ok) return { kind: "ok" };
    if (lockedUntil) {
      console.warn("[pin] pinkode låst", { staffId, location: context.location, failedAttempts: next, lockedUntil });
      return { kind: "locked", message: lockMessageFor(next) };
    }
    return { kind: "wrong" };
  }
  // Vedvarende kamp om rækken: afvis frem for at lukke ind.
  return { kind: "wrong" };
}
