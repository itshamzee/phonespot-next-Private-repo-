import { describe, it, expect } from "vitest";
import { ALL_TRADE_IN_STATUSES, resolveTradeInStatus } from "@/lib/supabase/trade-in-types";
import { chunkIds, fetchInChunks } from "@/lib/supabase/in-chunks";
import {
  buildOverviewQuery,
  parseOverviewState,
  lastActivity,
  stageSince,
  payoutState,
  latestOffer,
  type OverviewFacts,
} from "@/lib/buyback/overview";

describe("resolveTradeInStatus", () => {
  it("lets an accepted offer beat an earlier manual afvist/lukket/ny/modtaget", () => {
    for (const manual of ["afvist", "lukket", "ny", "modtaget", "tilbud_sendt"] as const) {
      const r = resolveTradeInStatus(manual, "accepteret");
      expect(r.status).toBe("accepteret");
      expect(r.manualActive).toBe(false);
      expect(r.manualIgnored).toBe(manual);
    }
  });

  it("lets paid beat a manual status", () => {
    expect(resolveTradeInStatus("afvist", "betalt").status).toBe("betalt");
  });

  it("keeps the manual status when nothing is accepted", () => {
    const r = resolveTradeInStatus("afvist", "tilbud_sendt");
    expect(r).toEqual({ status: "afvist", manualActive: true, manualIgnored: null });
  });

  it("uses derived when there is no manual status", () => {
    expect(resolveTradeInStatus(null, "ny")).toEqual({
      status: "ny",
      manualActive: false,
      manualIgnored: null,
    });
  });

  it("does not report an ignored override when it equals the derived status", () => {
    expect(resolveTradeInStatus("accepteret", "accepteret").manualIgnored).toBeNull();
  });
});

describe("chunkIds / fetchInChunks", () => {
  it("splits into batches of at most 100", () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id${i}`);
    expect(chunkIds(ids).map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunkIds([])).toEqual([]);
  });

  it("concatenates rows from every batch", async () => {
    const ids = Array.from({ length: 205 }, (_, i) => `id${i}`);
    const seen: number[] = [];
    const { data, error } = await fetchInChunks<string>(ids, async (c) => {
      seen.push(c.length);
      return { data: c, error: null };
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(205);
    expect(seen).toEqual([100, 100, 5]);
  });

  it("surfaces an error but keeps the rows that did load", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id${i}`);
    let n = 0;
    const { data, error } = await fetchInChunks<string>(ids, async (c) => {
      n += 1;
      return n === 2 ? { data: null, error: { message: "boom" } } : { data: c, error: null };
    });
    expect(error?.message).toBe("boom");
    expect(data).toHaveLength(100);
  });

  it("does not call the query for an empty id list", async () => {
    const { data, error } = await fetchInChunks<string>([], async () => {
      throw new Error("should not run");
    });
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
});

describe("overview URL state", () => {
  const parse = (qs: string) => parseOverviewState(new URLSearchParams(qs), ALL_TRADE_IN_STATUSES);

  it("defaults when empty", () => {
    expect(parse("")).toEqual({ folder: "aktive", filter: "alle", store: "alle", search: "" });
  });

  it("reads all four values", () => {
    expect(parse("status=accepteret&butik=vejle&q=iphone")).toEqual({
      folder: "aktive",
      filter: "accepteret",
      store: "vejle",
      search: "iphone",
    });
  });

  it("puts a closed status in the closed folder and falls back on garbage", () => {
    expect(parse("status=afvist").folder).toBe("afviste");
    expect(parse("mappe=afviste").folder).toBe("afviste");
    expect(parse("status=nonsense&butik=mars&mappe=x")).toEqual({
      folder: "aktive",
      filter: "alle",
      store: "alle",
      search: "",
    });
  });

  it("builds a query without defaults and round-trips", () => {
    expect(buildOverviewQuery({ folder: "aktive", filter: "alle", store: "alle", search: "" })).toBe("");
    const state = {
      folder: "afviste" as const,
      filter: "afvist" as const,
      store: "slagelse" as const,
      search: "æble ø",
    };
    expect(parse(buildOverviewQuery(state))).toEqual(state);
  });
});

describe("row facts", () => {
  const base: OverviewFacts = {
    createdAt: "2026-09-01T10:00:00Z",
    offers: [
      { status: "pending", created_at: "2026-09-02T10:00:00Z" },
      { status: "accepted", created_at: "2026-09-03T10:00:00Z", responded_at: "2026-09-05T10:00:00Z" },
    ],
    receipts: [],
    label: { created_at: "2026-09-06T10:00:00Z" },
  };

  it("takes the newest timestamp as last activity", () => {
    expect(lastActivity(base)).toBe("2026-09-06T10:00:00Z");
  });

  it("measures stage from the event that created it, with created_at fallback", () => {
    expect(stageSince("accepteret", base)).toBe("2026-09-05T10:00:00Z");
    expect(stageSince("afventer_forsendelse", base)).toBe("2026-09-06T10:00:00Z");
    expect(stageSince("paa_vej", base)).toBe("2026-09-01T10:00:00Z");
    expect(stageSince("ny", base)).toBe("2026-09-01T10:00:00Z");
  });

  it("derives payout state", () => {
    expect(payoutState({ ...base, offers: [] })).toBeNull();
    expect(payoutState(base)).toBe("mangler_bank");
    const withBank: OverviewFacts = {
      ...base,
      offers: [
        {
          status: "accepted",
          created_at: "2026-09-03T10:00:00Z",
          seller_bank_reg: "1234",
          seller_bank_account: "5678",
        },
      ],
    };
    expect(payoutState(withBank)).toBe("skal_udbetales");
    expect(payoutState({ ...withBank, receipts: [{ status: "paid" }] })).toBe("udbetalt");
  });

  it("picks the right latest offer regardless of input order", () => {
    const offers = [
      { status: "rejected", created_at: "2026-09-01T00:00:00Z" },
      { status: "pending", created_at: "2026-09-03T00:00:00Z" },
      { status: "pending", created_at: "2026-09-02T00:00:00Z" },
    ];
    expect(latestOffer(offers)?.created_at).toBe("2026-09-03T00:00:00Z");
  });
});
