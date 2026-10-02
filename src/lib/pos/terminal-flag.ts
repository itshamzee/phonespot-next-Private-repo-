import { NextResponse } from "next/server";

export { STRIPE_TERMINAL_ENABLED } from "./constants";

/** Response for the Stripe Terminal routes while the flag is off. */
export function terminalDisabled() {
  return NextResponse.json(
    { error: "Stripe Terminal er slået fra. Kortbetaling i butik tastes som Kort (terminal)." },
    { status: 404 },
  );
}
