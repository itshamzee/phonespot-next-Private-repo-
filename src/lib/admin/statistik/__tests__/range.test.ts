import { describe, expect, it } from "vitest";
import { statRange, parseStatQuery, nowBlockRanges } from "../range";

const at = (iso: string) => new Date(iso);

describe("statRange", () => {
  it("idag compares with yesterday up to the same time", () => {
    const r = statRange("idag", at("2026-11-18T13:32:00Z")); // 14:32 dansk
    expect(r.startIso).toBe("2026-11-17T23:00:00.000Z");
    expect(r.prev).toEqual({ startIso: "2026-11-16T23:00:00.000Z", endIso: "2026-11-17T13:32:00.000Z" });
    expect(r.unit).toBe("time");
    expect(r.buckets).toHaveLength(24);
  });
  it("30d covers 30 Danish days ending today and compares with the 30 before", () => {
    const r = statRange("30d", at("2026-11-18T13:32:00Z"));
    expect(r.from).toBe("2026-10-20"); expect(r.to).toBe("2026-11-18");
    expect(r.buckets).toHaveLength(30);
    expect(r.prev!.startIso).toBe("2026-09-19T22:00:00.000Z"); // sommertid
  });
  it("keeps whole days across the autumn DST change", () => {
    const r = statRange({ from: "2026-10-24", to: "2026-10-26" }, at("2026-11-18T12:00:00Z"));
    const hours = r.buckets.map((b) => (Date.parse(b.endIso) - Date.parse(b.startIso)) / 3_600_000);
    expect(hours).toEqual([24, 25, 24]);
  });
  it("hourly buckets on the DST day cover 25 hours without gaps", () => {
    const r = statRange({ from: "2026-10-25", to: "2026-10-25" }, at("2026-11-18T12:00:00Z"));
    expect(r.buckets[0].startIso).toBe(r.startIso);
    expect(r.buckets.at(-1)!.endIso).toBe(r.endIso);
    for (let i = 1; i < r.buckets.length; i++) expect(r.buckets[i].startIso).toBe(r.buckets[i - 1].endIso);
  });
  it("aar has monthly buckets and no comparison", () => {
    const r = statRange("aar", at("2026-11-18T12:00:00Z"));
    expect(r.unit).toBe("maaned"); expect(r.prev).toBeNull(); expect(r.buckets).toHaveLength(11);
  });
});

describe("parseStatQuery", () => {
  const now = at("2026-11-18T12:00:00Z");
  it("falls back to 30d on garbage", () => {
    expect(parseStatQuery({ periode: "x", fra: "nope" }, now, "2026-03-10").preset).toBe("30d");
  });
  it("swaps reversed dates and clamps to data start and today", () => {
    const r = parseStatQuery({ fra: "2027-01-01", til: "2025-01-01" }, now, "2026-03-10");
    expect(r.preset).toBe("valg"); expect(r.from).toBe("2026-03-10"); expect(r.to).toBe("2026-11-18");
  });
});

describe("nowBlockRanges", () => {
  it("month compares the 1st-to-now span with the same span last month", () => {
    const { maaned } = nowBlockRanges(at("2026-11-18T13:32:00Z"));
    expect(maaned.from).toBe("2026-11-01");
    expect(maaned.prev).toEqual({ startIso: "2026-09-30T22:00:00.000Z", endIso: "2026-10-18T12:32:00.000Z" });
  });
});
