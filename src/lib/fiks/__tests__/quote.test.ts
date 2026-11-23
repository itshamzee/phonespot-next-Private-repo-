// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { quoteBuybackImpl } from "@/lib/mail-agent/quote-buyback";
import type { PricedBuybackQuote, ToolContext } from "@/lib/mail-agent/tools";
import { readStoredQuote, toPublicQuote, toStoredQuote } from "@/lib/fiks/quote";
import { formatKroner, sellAction, sellHref } from "@/lib/fiks/quote-shared";

const input = {
  model: " iPhone 13 ",
  storage: "128GB",
  screen: "Perfekt" as const,
  back: "Små ridser" as const,
  battery: "God (80%+)" as const,
  charging_broken: false,
  other_faults: false,
  cloud_locked: "Nej" as const,
};
const loadSettings = vi.fn(async () => ({}) as never);

function ctx(withChannel: boolean): ToolContext {
  return {
    supabase: {} as never,
    verified: { emails: [] },
    log: [],
    outputs: [],
    scopeMismatch: { value: false },
    ...(withChannel ? { buybackQuotes: [] as PricedBuybackQuote[] } : {}),
  };
}

describe("quote_buyback side channel", () => {
  it("records the structured quote and replaces the pasted link when the chat asks for it", async () => {
    const c = ctx(true);
    const estimate = vi.fn(async () => ({ status: "priced" as const, amountOre: 215049 }));
    const out = await quoteBuybackImpl(c, input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toContain("2.150 kr.");
    expect(out).not.toContain("https://phonespot.dk/saelg-din-enhed");
    expect(out).toContain("knap");
    expect(c.buybackQuotes).toEqual([{ input: { ...input, model: "iPhone 13" }, amount: 2150 }]);
  });

  it("records nothing for an unpriced or refused quote", async () => {
    const c = ctx(true);
    const estimate = vi.fn(async () => ({ status: "none" as const, reason: "Andet" }));
    await quoteBuybackImpl(c, input, { estimate: estimate as never, loadSettings: loadSettings as never });
    await quoteBuybackImpl(c, { ...input, cloud_locked: "Ved ikke" }, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(c.buybackQuotes).toEqual([]);
  });

  it("leaves the mail agent's text unchanged when no side channel is set", async () => {
    const estimate = vi.fn(async () => ({ status: "priced" as const, amountOre: 250000 }));
    const out = await quoteBuybackImpl(ctx(false), input, { estimate: estimate as never, loadSettings: loadSettings as never });
    expect(out).toContain("https://phonespot.dk/saelg-din-enhed");
  });
});

describe("stored quote", () => {
  const stored = toStoredQuote({ input: { ...input, model: "iPhone 13" }, amount: 2150 }, "2026-11-19T10:30:00.000Z");

  it("round-trips through metadata and exposes no timestamp publicly", () => {
    expect(readStoredQuote({ fiks_quote: stored })).toEqual(stored);
    expect(toPublicQuote(stored)).toEqual({
      model: "iPhone 13",
      storage: "128GB",
      answers: { screen: "Perfekt", back: "Små ridser", battery: "God (80%+)", charging_broken: false, other_faults: false, cloud_locked: "Nej" },
      amount: 2150,
    });
  });

  it("rejects missing or malformed data", () => {
    expect(readStoredQuote({})).toBeNull();
    expect(readStoredQuote(null)).toBeNull();
    expect(readStoredQuote({ fiks_quote: { ...stored, amount: "2150" } })).toBeNull();
    expect(readStoredQuote({ fiks_quote: { ...stored, amount: -1 } })).toBeNull();
    expect(readStoredQuote({ fiks_quote: { ...stored, answers: { screen: "Perfekt" } } })).toBeNull();
  });
});

describe("sell action", () => {
  it("links to the sell form with the token and readable model, but no price", () => {
    const href = sellHref({ model: "iPhone 13 Pro", storage: "256GB" }, "tok-1");
    expect(href).toBe("/saelg-din-enhed?model=iPhone+13+Pro&storage=256GB&fiks=tok-1#start");
    const action = sellAction({ model: "iPhone 13 Pro", storage: "256GB", amount: 2150 }, "tok-1");
    expect(action).toEqual({ type: "sell", label: "Fortsæt til formularen", href, model: "iPhone 13 Pro", amount: 2150 });
    expect(action.href).not.toContain("2150");
  });

  it("formats kroner with a Danish thousands separator", () => {
    expect(formatKroner(2150)).toBe("2.150 kr.");
    expect(formatKroner(950)).toBe("950 kr.");
    expect(formatKroner(12500)).toBe("12.500 kr.");
  });
});
