/**
 * Tynde fetch-hjælpere til Kundecenterets ruter. Alle svar bliver til
 * { ok, status, data, error }, så kalderen kan vise serverens danske fejltekst.
 * Der sendes aldrig et medarbejdernavn i en body: serveren bruger sessionen.
 */

export type ApiResult<T = Record<string, unknown>> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; data: Record<string, unknown> };

const NETWORK = "Ingen forbindelse til serveren. Tjek nettet, og prøv igen.";

async function call<T = Record<string, unknown>>(url: string, init: RequestInit, fallback: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, status: 0, error: NETWORK, data: {} };
  }
  let data: Record<string, unknown> = {};
  try {
    const json: unknown = await res.json();
    if (json && typeof json === "object") data = json as Record<string, unknown>;
  } catch {
    // Tomt eller ikke-JSON svar: fejlteksten falder tilbage til standarden.
  }
  if (res.ok) return { ok: true, status: res.status, data: data as T };
  const error = typeof data.error === "string" && data.error ? data.error : fallback;
  return { ok: false, status: res.status, error, data };
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type InboxActionBody =
  | { type: "take"; expectAssignedTo: string | null }
  | { type: "release"; expectAssignedTo: string | null }
  | { type: "snooze"; until: string }
  | { type: "unsnooze" }
  | { type: "done" }
  | { type: "waiting" }
  | { type: "reopen"; to?: "ny" | "venter_paa_svar" | "besvaret"; snoozedUntil?: string }
  | { type: "note"; body: string }
  | { type: "verdict"; draftId: string; verdict: "correct" | "wrong"; note?: string };

export function postAction(id: string, body: InboxActionBody) {
  return call(`/api/admin/inbox/${encodeURIComponent(id)}/action`, post(body), "Handlingen kunne ikke gennemføres. Prøv igen.");
}

export function postReply(id: string, body: { body: string; channel: "email" | "sms"; after: "done" | "waiting" }) {
  return call<{ id?: string; warning?: string }>(
    `/api/contact/${encodeURIComponent(id)}/reply`,
    post(body),
    "Svaret blev ikke sendt. Prøv igen.",
  );
}

/** Sender et ventende udkast (evt. redigeret) i medarbejderens navn; serveren bogfører som svar-ruten. */
export function approveDraft(draftId: string, body: string, after: "done" | "waiting") {
  return call<{ warning?: string }>(
    `/api/admin/mail-agent/drafts/${encodeURIComponent(draftId)}/approve`,
    post({ body, after }),
    "Svaret blev ikke sendt. Prøv igen.",
  );
}

export function getJson<T>(url: string, signal: AbortSignal, fallback: string) {
  return call<T>(url, { signal, cache: "no-store" }, fallback);
}

/** Reply-rutens særtilfælde: SMS'en ER sendt, men kunne ikke gemmes i tråden. */
export function smsSentButNotSaved(r: ApiResult): boolean {
  return !r.ok && r.status === 500 && r.error.startsWith("SMS'en er sendt");
}
