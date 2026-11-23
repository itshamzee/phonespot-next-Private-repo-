import type { Stream } from "@/lib/admin/statistik/lines";

/** Fælles for Statistik-komponenterne (ingen "use client", så server og klient kan dele det). */

/** Hvad grafen og butiksfordelingen viser; ?vis=fortjeneste (kun ejeren). */
export type Metric = "omsaetning" | "fortjeneste";

/** De tre typer i rækkefølgen fra designet. */
export const STREAMS: readonly { key: Stream; label: string }[] = [
  { key: "webshop", label: "Webshop" },
  { key: "kasse", label: "Kassesalg" },
  { key: "reparation", label: "Reparation" },
];
