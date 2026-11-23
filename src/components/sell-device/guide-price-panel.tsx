"use client";

import { useEffect, useState } from "react";

type Device = { deviceType: string; brand: string; model: string; storage: string; ram?: string; useCustom: boolean };
type Condition = { screen: string; back: string; battery: string; allWorking: string; brokenParts: string[]; cloudLocked: string };

// Enheder, hvor formularen kun spørger om udvendig stand (samme liste som serveren).
const OUTER_TYPES = new Set(["Konsol", "Controller", "Høretelefoner", "Dyson", "Smart home"]);

/** Fin stand uden fejl for enhedstypen: det, "op til"-prisen regnes på. */
export function perfectCondition(deviceType: string): Condition {
  const outer = OUTER_TYPES.has(deviceType);
  return {
    screen: "Perfekt",
    back: outer ? "" : "Perfekt",
    battery: outer ? "" : "God (80%+)",
    allWorking: "Ja",
    brokenParts: [],
    cloudLocked: deviceType === "Telefon" || deviceType === "Tablet" ? "Nej" : "",
  };
}

type Result = { key: string; amountDkk: number; topDkk: number | null };

const kr = (value: number) => `${value.toLocaleString("da-DK")} kr.`;

/** Spørger serveren om prisen. Ingen pris er ikke en fejl: formularen virker uden. */
function useGuidePrice(device: Device, condition: Condition, enabled: boolean): Result | null {
  const [result, setResult] = useState<Result | null>(null);
  const eligible = enabled && !device.useCustom && !!device.deviceType && !!device.brand && !!device.model;
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
        setResult(
          data?.priced === true && typeof data.amountDkk === "number"
            ? { key, amountDkk: data.amountDkk, topDkk: typeof data.topDkk === "number" ? data.topDkk : null }
            : null,
        );
      } catch {
        // Afbrudt eller netværksfejl: vis ingenting.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  // En pris for et tidligere svar må aldrig stå tilbage, når enhed eller stand er ændret.
  return key && result && result.key === key ? result : null;
}

type Props = {
  device: Device;
  condition: Condition;
  /** Sandt, når alle spørgsmål om stand er besvaret for enheden. */
  ready: boolean;
};

/**
 * Prisen under stand-spørgsmålene. Den følger svarene med det samme, og er den
 * lavere end fin stand, står det, hvad standen koster, så kunden kan se hvorfor.
 */
export function GuidePricePanel({ device, condition, ready }: Props) {
  const result = useGuidePrice(device, condition, ready);
  if (!result) return null;
  const deduction = result.topDkk != null ? result.topDkk - result.amountDkk : 0;
  const name = [device.model, device.storage].filter(Boolean).join(" ");

  return (
    <div aria-live="polite" className="rounded-md border border-green-eco/30 bg-green-eco/[0.06] px-4 py-4">
      <p className="text-sm text-gray">Det betaler vi for din {name}</p>
      <p className="mt-0.5 font-body text-3xl font-semibold text-charcoal">{kr(result.amountDkk)}</p>
      {deduction > 0 && result.topDkk != null && (
        <p className="mt-1 text-sm text-gray">
          I fin stand uden fejl: {kr(result.topDkk)} Standen, du har beskrevet, trækker {kr(deduction)} fra.
        </p>
      )}
      <p className="mt-2 text-sm text-charcoal">
        Prisen holder, når enheden svarer til din beskrivelse. Pengene kommer samme dag, som vi modtager den.
      </p>
    </div>
  );
}

/**
 * "Op til"-prisen, så snart model og lagerplads er valgt, før standen er beskrevet.
 * Vises kun, når der findes en pris for modellen.
 */
export function GuidePriceTeaser({ device }: { device: Device }) {
  const needsStorage = device.deviceType === "Telefon" || device.deviceType === "Tablet" || device.deviceType === "Laptop";
  const result = useGuidePrice(device, perfectCondition(device.deviceType), !needsStorage || !!device.storage);
  if (!result) return null;

  return (
    <p aria-live="polite" className="flex flex-wrap items-baseline gap-x-2 rounded-md bg-green-eco/[0.06] px-4 py-3 text-sm text-charcoal">
      <span>Vi betaler op til</span>
      <strong className="text-lg font-semibold">{kr(result.amountDkk)}</strong>
      <span className="text-gray">for din {[device.model, device.storage].filter(Boolean).join(" ")} i fin stand. Den præcise pris ser du på næste trin.</span>
    </p>
  );
}
