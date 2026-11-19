import type { PricedBuybackQuote } from "@/lib/mail-agent/tools";
import type { FiksQuoteAnswers, FiksQuotePublic } from "./quote-shared";

/** Stored on the chat inquiry as metadata.fiks_quote: the latest priced quote_buyback in the chat. */
export interface StoredFiksQuote extends FiksQuotePublic {
  at: string;
}

export function toStoredQuote(quote: PricedBuybackQuote, at: string): StoredFiksQuote {
  const { model, storage, screen, back, battery, charging_broken, other_faults, cloud_locked } = quote.input;
  return {
    model,
    storage,
    answers: { screen, back, battery, charging_broken, other_faults, cloud_locked },
    amount: quote.amount,
    at,
  };
}

const str = (v: unknown): v is string => typeof v === "string";

/** The stored quote, or null if metadata has none or it does not have the expected shape. */
export function readStoredQuote(metadata: Record<string, unknown> | null | undefined): StoredFiksQuote | null {
  const q = metadata?.fiks_quote as Record<string, unknown> | undefined;
  if (!q || typeof q !== "object") return null;
  const a = q.answers as Record<string, unknown> | undefined;
  if (!str(q.model) || !str(q.storage) || !str(q.at)) return null;
  if (typeof q.amount !== "number" || !Number.isFinite(q.amount) || q.amount <= 0) return null;
  if (!a || !str(a.screen) || !str(a.back) || !str(a.battery) || !str(a.cloud_locked)) return null;
  if (typeof a.charging_broken !== "boolean" || typeof a.other_faults !== "boolean") return null;
  const answers: FiksQuoteAnswers = {
    screen: a.screen,
    back: a.back,
    battery: a.battery,
    charging_broken: a.charging_broken,
    other_faults: a.other_faults,
    cloud_locked: a.cloud_locked,
  };
  return { model: q.model, storage: q.storage, answers, amount: q.amount, at: q.at };
}

export function toPublicQuote(q: StoredFiksQuote): FiksQuotePublic {
  return { model: q.model, storage: q.storage, answers: q.answers, amount: q.amount };
}
