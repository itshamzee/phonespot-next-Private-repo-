"use client";

import { useEffect, useState } from "react";

type Device = { deviceType: string; brand: string; model: string; storage: string; useCustom: boolean };
type Condition = { screen: string; back: string; battery: string; allWorking: string; brokenParts: string[]; cloudLocked: string };

type Props = {
  device: Device;
  condition: Condition;
  /** Sandt, når alle spørgsmål om stand er besvaret for enheden. */
  ready: boolean;
};

/**
 * Viser den vejledende opkøbspris under stand-spørgsmålene. Serveren afgør, om
 * der findes en pris (funktionen kan være slået fra, og ikke alle modeller er
 * med), så uden svar viser panelet ingenting, og formularen er som før.
 */
export function GuidePricePanel({ device, condition, ready }: Props) {
  const [result, setResult] = useState<{ key: string; amountDkk: number } | null>(null);

  // Kun iPhones kan få en pris i første runde, så andre enheder spørger slet ikke.
  const eligible =
    ready && !device.useCustom && device.deviceType === "Telefon" && device.brand === "Apple" && !!device.model && !!device.storage;
  const key = eligible ? JSON.stringify({ device, condition }) : "";

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/trade-in/guide-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal,
        });
        const data = res.ok ? await res.json() : null;
        setResult(data?.priced === true && typeof data.amountDkk === "number" ? { key, amountDkk: data.amountDkk } : null);
      } catch {
        // Ingen pris er ikke en fejl for kunden: formularen virker uden.
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  // En pris for et tidligere svar må aldrig stå tilbage, når standen er ændret.
  if (!key || !result || result.key !== key) return null;

  return (
    <div aria-live="polite" className="rounded-md border border-green-eco/30 bg-green-eco/[0.06] px-4 py-4">
      <p className="text-sm text-gray">Vejledende pris</p>
      <p className="mt-0.5 font-body text-3xl font-semibold text-charcoal">{result.amountDkk.toLocaleString("da-DK")} kr.</p>
      <p className="mt-2 text-sm text-charcoal">
        Prisen gælder din {device.model} {device.storage}, som du har beskrevet den. Den endelige pris får du, når vi har tjekket
        telefonen. Stemmer den med din beskrivelse, holder prisen.
      </p>
    </div>
  );
}
