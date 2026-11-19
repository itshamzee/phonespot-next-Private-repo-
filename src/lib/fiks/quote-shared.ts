/**
 * Fiks' buyback quote as the widget and the sell form see it. No server
 * imports: the chat widget and the sell wizard both use this file.
 */

export const SELL_PAGE = "/saelg-din-enhed";

/** The condition answers quote_buyback was called with (same strings as the sell form). */
export interface FiksQuoteAnswers {
  screen: string;
  back: string;
  battery: string;
  charging_broken: boolean;
  other_faults: boolean;
  cloud_locked: string;
}

/** What GET /api/fiks/quote returns. The amount is whole kroner from the tool, never from a URL. */
export interface FiksQuotePublic {
  model: string;
  storage: string;
  answers: FiksQuoteAnswers;
  amount: number;
}

/** The one-tap handoff from a chat reply to the sell form. */
export interface FiksSellAction {
  type: "sell";
  label: string;
  href: string;
  model: string;
  amount: number;
}

export const SELL_ACTION_LABEL = "Fortsæt til formularen";

/** 2150 → "2.150 kr." (Danish thousands separator, independent of the runtime's ICU data). */
export function formatKroner(amount: number): string {
  const whole = Math.round(amount);
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} kr.`;
}

/**
 * Link to the sell form. Model and storage are only there to make the link
 * readable; the form takes everything, the price included, from the server by
 * the chat token.
 */
export function sellHref(quote: { model: string; storage: string }, token: string): string {
  const params = new URLSearchParams({ model: quote.model, storage: quote.storage, fiks: token });
  return `${SELL_PAGE}?${params.toString()}#start`;
}

export function sellAction(quote: { model: string; storage: string; amount: number }, token: string): FiksSellAction {
  return { type: "sell", label: SELL_ACTION_LABEL, href: sellHref(quote, token), model: quote.model, amount: quote.amount };
}
