import { NextResponse } from "next/server";
import { describeLagersystemError, LagersystemError, type ClientErrorCode } from "./client";

export const NOT_ENABLED = { error: "Lagersystemet er ikke slået til" } as const;

/** Netværk/5xx → 502; API-fejl beholder deres status; ukendt → 500. `overrides` giver rute-specifik tekst pr. kode. */
export function lagersystemErrorResponse(err: unknown, overrides: Partial<Record<ClientErrorCode, string>> = {}): NextResponse {
  if (!(err instanceof LagersystemError)) {
    console.error("[lagersystem] uventet fejl", err);
    return NextResponse.json({ error: describeLagersystemError(err), code: "internal" }, { status: 500 });
  }
  const status = err.status === 0 || err.status >= 500 ? 502 : err.status;
  return NextResponse.json({ error: overrides[err.code] ?? describeLagersystemError(err), code: err.code }, { status });
}

/** Lokation uden for medarbejderens butik (ikke et række-id, så 403 og ikke 404). */
export function forbiddenLocation(): NextResponse {
  return NextResponse.json({ error: "Du har ikke adgang til denne butik." }, { status: 403 });
}
