// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const estimate = vi.fn();
vi.mock("@/lib/buyback/guide-price-server", () => ({ estimateGuidePrice: (...a: unknown[]) => estimate(...a) }));
vi.mock("@/lib/buyback/settings", () => ({ loadBuybackSettings: async () => ({}) }));

import { fiksReply, loadQuoteForToken } from "@/lib/fiks/chat";
import { SAFE_PRICE_TEXT } from "@/lib/fiks/config";
import { fakeAnthropic, fakeSupabase, tool } from "./fakes";

const TOKEN = "11111111-2222-4333-8444-555555555555";
const now = () => new Date("2026-11-19T10:30:00Z");
const QUOTE_INPUT = {
  model: "iPhone 13",
  storage: "128GB",
  screen: "Små ridser",
  back: "Perfekt",
  battery: "God (80%+)",
  charging_broken: false,
  other_faults: false,
  cloud_locked: "Nej",
};

function seed(metadata: Record<string, unknown> = {}) {
  return {
    contact_inquiries: [
      { id: "inq-1", channel: "chat", source: "fiks-chat", external_thread_id: TOKEN, status: "besvaret", metadata, created_at: "2026-11-19T10:00:00Z" },
    ],
  };
}

beforeEach(() => {
  estimate.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fiksReply: buyback quote", () => {
  it("stores the priced quote in metadata, merged with what is there, and returns it", async () => {
    estimate.mockResolvedValue({ status: "priced", amountOre: 215000 });
    const { client, db } = fakeSupabase(seed({ fiks_ip: "ip-a", fiks_handoff_at: "2026-11-19T10:05:00Z" }));
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "quote_buyback").run(QUOTE_INPUT);
      return "Din iPhone 13 er vejledende 2.150 kr. værd. Knappen herunder fører dig til formularen.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "Små ridser, ellers fin", anthropic, now });

    const expected = {
      model: "iPhone 13",
      storage: "128GB",
      answers: { screen: "Små ridser", back: "Perfekt", battery: "God (80%+)", charging_broken: false, other_faults: false, cloud_locked: "Nej" },
      amount: 2150,
      at: now().toISOString(),
    };
    expect(out.quote).toEqual(expected);
    expect(db.tables.contact_inquiries[0].metadata).toEqual({ fiks_ip: "ip-a", fiks_handoff_at: "2026-11-19T10:05:00Z", fiks_quote: expected });
    expect(await loadQuoteForToken(client, TOKEN)).toEqual(expected);
  });

  it("keeps a handoff made in the same turn when storing the quote", async () => {
    estimate.mockResolvedValue({ status: "priced", amountOre: 100000 });
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "quote_buyback").run(QUOTE_INPUT);
      await tool(p, "handoff").run({ name: "Bo", email: "bo@example.com", summary: "Vil sælge" });
      return "Prisen er vejledende 1.000 kr.";
    });
    await fiksReply({ supabase: client, sessionToken: TOKEN, message: "ok", anthropic, now });
    const md = db.tables.contact_inquiries[0].metadata as Record<string, unknown>;
    expect(md.fiks_handoff_at).toBeTruthy();
    expect((md.fiks_quote as { amount: number }).amount).toBe(1000);
  });

  it("stores nothing when the tool gave no price", async () => {
    estimate.mockResolvedValue({ status: "none", reason: "Andet" });
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "quote_buyback").run({ ...QUOTE_INPUT, other_faults: true });
      return "Den kan jeg ikke give en pris på her. Brug formularen.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "Den tænder ikke", anthropic, now });
    expect(out.quote).toBeUndefined();
    expect(db.tables.contact_inquiries[0].metadata).toEqual({});
  });

  it("stores nothing when the reply is replaced by the amount filter", async () => {
    estimate.mockResolvedValue({ status: "priced", amountOre: 215000 });
    const { client, db } = fakeSupabase(seed());
    const { anthropic } = fakeAnthropic(async (p) => {
      await tool(p, "quote_buyback").run(QUOTE_INPUT);
      return "Du får 3.000 kr.";
    });
    const out = await fiksReply({ supabase: client, sessionToken: TOKEN, message: "Hvad får jeg?", anthropic, now });
    expect(out.reply).toBe(SAFE_PRICE_TEXT);
    expect(out.quote).toBeUndefined();
    expect(db.tables.contact_inquiries[0].metadata).toEqual({});
  });

  it("finds no quote for an unknown or malformed token", async () => {
    const { client } = fakeSupabase(seed({ fiks_quote: { model: "x" } }));
    expect(await loadQuoteForToken(client, "nope")).toBeNull();
    expect(await loadQuoteForToken(client, "99999999-2222-4333-8444-555555555555")).toBeNull();
    // Malformed stored data counts as no quote.
    expect(await loadQuoteForToken(client, TOKEN)).toBeNull();
  });
});
